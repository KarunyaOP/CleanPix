import os
import sys
import io
import time
import gc
import asyncio
import urllib.request
import traceback
from contextlib import asynccontextmanager
import numpy as np
from PIL import Image
import scipy.ndimage as ndi
import onnxruntime as ort
import psutil
from fastapi import FastAPI, Request, Response, HTTPException, Header, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

# Ensure stdout/stderr UTF-8
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

MODEL_DIR = os.environ.get("MODEL_DIR", os.path.join(os.path.expanduser("~"), ".cleanpix", "models"))
MODEL_PATH = os.environ.get("MODEL_PATH", os.path.join(MODEL_DIR, "rmbg-1.4.onnx"))
MODEL_URL = os.environ.get(
    "MODEL_URL",
    "https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx"
)
API_SECRET = os.environ.get("AI_WORKER_SECRET", "").strip()

_SESSION = None
_INPUT_NAME = None
_START_TIME = time.time()
_INFERENCE_LOCK = asyncio.Lock()
_PROCESS = psutil.Process(os.getpid())

def get_memory_mb() -> float:
    try:
        return _PROCESS.memory_info().rss / (1024 * 1024)
    except Exception:
        return 0.0

def ensure_model():
    global _SESSION, _INPUT_NAME
    os.makedirs(MODEL_DIR, exist_ok=True)
    if not os.path.exists(MODEL_PATH) or os.path.getsize(MODEL_PATH) < 100000000:
        print(f"[AI-WORKER] Downloading BRIA RMBG-1.4 model to {MODEL_PATH} ...", flush=True)
        t0 = time.time()
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print(f"[AI-WORKER] Model downloaded in {time.time() - t0:.2f}s ({os.path.getsize(MODEL_PATH)} bytes)", flush=True)
    else:
        print(f"[AI-WORKER] Model verified on disk: {MODEL_PATH} ({os.path.getsize(MODEL_PATH)} bytes)", flush=True)

    print(f"[AI-WORKER] Initializing low-memory ONNX Runtime session (RSS: {get_memory_mb():.1f} MB)...", flush=True)
    
    session_opts = ort.SessionOptions()
    # CRITICAL: Disable greedy CPU memory arena allocation to prevent OOM on 512MB containers
    session_opts.enable_cpu_mem_arena = False
    # Sequential execution to prevent parallel operator buffer bloat
    session_opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
    # Cap threads to 2 (prevents thread-pool memory explosion on multi-core host VMs)
    session_opts.intra_op_num_threads = min(2, os.cpu_count() or 1)
    session_opts.inter_op_num_threads = 1
    session_opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_BASIC

    available_providers = ort.get_available_providers()
    providers = ['CPUExecutionProvider']
    if 'CUDAExecutionProvider' in available_providers:
        providers.insert(0, 'CUDAExecutionProvider')

    _SESSION = ort.InferenceSession(MODEL_PATH, session_opts, providers=providers)
    _INPUT_NAME = _SESSION.get_inputs()[0].name
    print(f"[AI-WORKER] Session initialized! Providers: {_SESSION.get_providers()}, Input: {_INPUT_NAME} (RSS: {get_memory_mb():.1f} MB)", flush=True)

    # Warm-up inference with minimal dummy tensor
    print("[AI-WORKER] Running single warm-up tensor...", flush=True)
    dummy_input = np.zeros((1, 3, 1024, 1024), dtype=np.float32)
    _SESSION.run(None, {_INPUT_NAME: dummy_input})
    del dummy_input
    gc.collect()
    print(f"[AI-WORKER] Warm-up complete! Stable memory: {get_memory_mb():.1f} MB", flush=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_model()
    yield
    print("[AI-WORKER] Shutting down AI worker...", flush=True)

app = FastAPI(
    title="CleanPix AI Segmentation Microservice",
    description="Low-Memory High-Precision Background Removal Microservice using BRIA RMBG 1.4",
    version="1.0.1",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def verify_auth(x_api_key: str = None, authorization: str = None):
    if not API_SECRET:
        return True
    provided_key = x_api_key or ""
    if not provided_key and authorization and authorization.startswith("Bearer "):
        provided_key = authorization.replace("Bearer ", "").strip()
    if provided_key != API_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized: Invalid API secret")
    return True

def process_segmentation_low_memory(image_bytes: bytes) -> bytes:
    """
    High-Precision Low-Memory BRIA RMBG 1.4 Segmentation Pipeline.
    
    1. Decodes original RGB without mutating pixel values.
    2. Resizes to 1024x1024 RGB and applies official BRIA normalization: (x / 255.0 - 0.5) / 1.0.
    3. Executes ONNX inference with serialized concurrency and arena-disabled memory management.
    4. Postprocesses mask:
       - Min-max normalizes output tensor.
       - Fills enclosed saliency holes (white faces, character bodies).
       - Detaches thin radiant background ray bridges via morphological opening.
       - Discards disconnected low-area noise artifacts.
       - Restores exact object boundaries and applies sub-pixel antialiased feathering.
    5. Resizes alpha mask back to original dimensions.
    6. Losslessly composites alpha channel onto original untouched RGB pixels.
    """
    mem_start = get_memory_mb()
    t0 = time.time()

    if not image_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty image buffer provided")

    try:
        with Image.open(io.BytesIO(image_bytes)) as pil_img:
            orig_w, orig_h = pil_img.size
            # 1. Preserve original RGB pixel values
            orig_rgb = pil_img.convert("RGB")
            
            # 2. Resize directly to 1024x1024 RGB for RMBG 1.4 input
            work = orig_rgb.resize((1024, 1024), Image.Resampling.BILINEAR)

            # 3. Official BRIA RMBG 1.4 Preprocessing: float32, range [-0.5, 0.5]
            arr = np.array(work, dtype=np.float32)
            tensor = np.transpose((arr / 255.0 - 0.5) / 1.0, (2, 0, 1))[np.newaxis, :, :, :].astype(np.float32)
            del work, arr

            t_in_min, t_in_max, t_in_mean = float(tensor.min()), float(tensor.max()), float(tensor.mean())

            # 4. Neural inference
            t_inf_start = time.time()
            outputs = _SESSION.run(None, {_INPUT_NAME: tensor})
            inf_ms = round((time.time() - t_inf_start) * 1000, 1)
            del tensor

            raw_mask = outputs[0][0, 0] # (1024, 1024)
            del outputs

            t_out_min, t_out_max, t_out_mean = float(raw_mask.min()), float(raw_mask.max()), float(raw_mask.mean())

            # 5. Min-max normalization
            mi = float(np.min(raw_mask))
            ma = float(np.max(raw_mask))
            if ma > mi:
                norm_mask = (raw_mask - mi) / (ma - mi)
            else:
                norm_mask = raw_mask
            del raw_mask

            # 6. Advanced Quality Postprocessing:
            # Step A: Binarize confident foreground
            fg_bin = norm_mask > 0.50
            struct = ndi.generate_binary_structure(2, 2)
            
            # Step B: Fill enclosed interior holes (white faces, character bodies, clothes)
            fg_filled = ndi.binary_fill_holes(fg_bin)
            
            # Step C: Detach thin background ray bridges via morphological opening
            fg_opened = ndi.binary_opening(fg_filled, structure=struct, iterations=5)
            
            # Step D: Remove disconnected small background noise components
            labeled, num_features = ndi.label(fg_opened)
            if num_features > 1:
                sizes = ndi.sum(fg_opened, labeled, range(1, num_features + 1))
                max_size = np.max(sizes)
                min_pixels = max(300, int(max_size * 0.005))
                valid_components = np.where(sizes >= min_pixels)[0] + 1
                fg_clean = np.isin(labeled, valid_components)
            else:
                fg_clean = fg_opened
                
            # Step E: Restore exact character boundaries from filled foreground
            fg_restored = ndi.binary_dilation(fg_clean, structure=struct, iterations=5) & fg_filled
            
            # Step F: Smooth antialiased feather zone along real subject edges
            fg_dilated = ndi.binary_dilation(fg_restored, structure=struct, iterations=2)
            
            final_mask_1024 = np.zeros_like(norm_mask)
            final_mask_1024[fg_restored] = 1.0
            edge_zone = fg_dilated & (~fg_restored)
            final_mask_1024[edge_zone] = np.clip(norm_mask[edge_zone], 0.0, 1.0)
            final_mask_1024 = ndi.gaussian_filter(final_mask_1024, sigma=0.5)
            final_mask_1024 = np.clip(final_mask_1024, 0.0, 1.0)
            del norm_mask, fg_bin, fg_filled, fg_opened, fg_clean, fg_restored, fg_dilated, edge_zone

            # Step G: Resize alpha mask back to ORIGINAL image dimensions using Bilinear interpolation
            alpha_mask = Image.fromarray((final_mask_1024 * 255.0).astype(np.uint8), mode="L").resize(
                (orig_w, orig_h),
                Image.Resampling.BILINEAR
            )
            del final_mask_1024

            mask_min, mask_max, mask_mean = alpha_mask.getextrema()[0], alpha_mask.getextrema()[1], float(np.mean(alpha_mask))

            # 7. Lossless Alpha Compositing:
            # Original RGB image remains 100% untouched.
            # Only the alpha channel is replaced by the generated mask.
            rgba_img = orig_rgb.copy()
            rgba_img.putalpha(alpha_mask)
            del orig_rgb, alpha_mask

            # 8. Export to PNG buffer
            out_io = io.BytesIO()
            rgba_img.save(out_io, format="PNG", optimize=False)
            del rgba_img

            result_bytes = out_io.getvalue()
            del out_io

    except HTTPException:
        raise
    except Exception as e:
        print(f"[AI-WORKER_ERROR] Segmentation failed: {e}", flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Segmentation failed: {str(e)}")
    finally:
        gc.collect()

    mem_end = get_memory_mb()
    total_ms = round((time.time() - t0) * 1000, 1)
    
    print(
        f"[AI-WORKER] Processed {orig_w}x{orig_h} in {total_ms}ms (Inf: {inf_ms}ms) | "
        f"In Tensor: [{t_in_min:.3f}, {t_in_max:.3f}, {t_in_mean:.3f}] | "
        f"Out Tensor: [{t_out_min:.3f}, {t_out_max:.3f}, {t_out_mean:.3f}] | "
        f"Alpha Mask: [{mask_min}, {mask_max}, {mask_mean:.1f}] | "
        f"RAM: {mem_end:.1f} MB (Delta: {mem_end - mem_start:+.1f} MB)",
        flush=True
    )

    return result_bytes

@app.get("/")
@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "CleanPix AI Segmentation Worker",
        "model": "BRIA RMBG 1.4",
        "model_loaded": _SESSION is not None,
        "providers": _SESSION.get_providers() if _SESSION else [],
        "resident_memory_mb": round(get_memory_mb(), 1),
        "uptime_seconds": round(time.time() - _START_TIME, 1)
    }

@app.post("/remove-bg")
async def remove_background(
    request: Request,
    x_api_key: str = Header(None, alias="x-api-key"),
    authorization: str = Header(None)
):
    verify_auth(x_api_key, authorization)

    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()
        file_obj = form.get("file") or form.get("image")
        if not file_obj:
            raise HTTPException(status_code=400, detail="No file field provided in multipart form data")
        image_bytes = await file_obj.read()
    else:
        image_bytes = await request.body()

    # Serialize inference execution through concurrency lock to protect container RAM
    async with _INFERENCE_LOCK:
        t0 = time.time()
        png_cutout_bytes = process_segmentation_low_memory(image_bytes)
        elapsed_ms = round((time.time() - t0) * 1000, 1)

    return Response(
        content=png_cutout_bytes,
        media_type="image/png",
        headers={
            "X-Processing-Time-Ms": str(elapsed_ms),
            "X-Model-Used": "BRIA-RMBG-1.4",
            "X-Worker-Memory-Mb": str(round(get_memory_mb(), 1))
        }
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
