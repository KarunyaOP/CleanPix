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
import onnxruntime as ort
import psutil
from fastapi import FastAPI, Request, Response, HTTPException, Header, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

# Ensure stdout/stderr UTF-8
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

DEFAULT_MODEL_NAME = "isnet-general-use.onnx"
MODEL_DIR = os.environ.get("MODEL_DIR", os.path.join(os.path.expanduser("~"), ".cleanpix", "models"))
MODEL_NAME = os.environ.get("MODEL_NAME", DEFAULT_MODEL_NAME)
MODEL_PATH = os.environ.get("MODEL_PATH", os.path.join(MODEL_DIR, MODEL_NAME))
MODEL_URL = os.environ.get(
    "MODEL_URL",
    "https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx"
    if "isnet" in MODEL_NAME
    else "https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx"
)
API_SECRET = os.environ.get("AI_WORKER_SECRET", "").strip()

_SESSION = None
_INPUT_NAME = None
_MODEL_NAME_LOADED = None
_START_TIME = time.time()
_INFERENCE_LOCK = asyncio.Lock()
_PROCESS = psutil.Process(os.getpid())

def get_memory_mb() -> float:
    try:
        return _PROCESS.memory_info().rss / (1024 * 1024)
    except Exception:
        return 0.0

def ensure_model():
    global _SESSION, _INPUT_NAME, _MODEL_NAME_LOADED
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    # Check if target model already exists in ~/.u2net/ as a local cached copy
    u2net_path = os.path.join(os.path.expanduser("~"), ".u2net", MODEL_NAME)
    if not os.path.exists(MODEL_PATH) or os.path.getsize(MODEL_PATH) < 100000000:
        if os.path.exists(u2net_path) and os.path.getsize(u2net_path) > 100000000:
            print(f"[AI-WORKER] Found pre-downloaded {MODEL_NAME} in {u2net_path}, copying to {MODEL_PATH}...", flush=True)
            import shutil
            shutil.copyfile(u2net_path, MODEL_PATH)
        else:
            print(f"[AI-WORKER] Downloading {MODEL_NAME} to {MODEL_PATH} ...", flush=True)
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
    _MODEL_NAME_LOADED = os.path.basename(MODEL_PATH)
    print(f"[AI-WORKER] Session initialized! Model: {_MODEL_NAME_LOADED}, Providers: {_SESSION.get_providers()}, Input: {_INPUT_NAME} (RSS: {get_memory_mb():.1f} MB)", flush=True)

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
    description="Low-Memory High-Precision Universal Background Removal Microservice",
    version="1.1.0",
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
    High-Fidelity Low-Memory Universal Dichotomous Image Segmentation Pipeline.
    
    1. Preserves original image pixel data and color channels directly (no flattening against black).
    2. Respects and extracts existing alpha channel if image is already RGBA/transparent.
    3. Proportional Aspect-Ratio Preserving Letterbox Preprocessing:
       - Resizes proportionally without aspect-ratio distortion to protect thin arms, fine hair,
         fingers, clothing edges, and narrow gaps between people.
       - Center-pads onto a neutral gray (128, 128, 128) 1024x1024 canvas.
    4. Normalizes input (float32, range [-0.5, 0.5]) and executes low-memory ONNX inference.
    5. Extracts the exact unpadded region corresponding strictly to the input image dimensions.
    6. Applies smooth continuous alpha mapping (Hermite smoothstep):
       - Cleans residual floating-point background noise to ensure transparent pixels are alpha = 0.
       - Ensures confident foreground pixels achieve full opacity (alpha = 255).
       - Preserves natural anti-aliased edge gradients, fine hair strands, fingers, and narrow gaps.
       - NEVER blind-fills enclosed holes or applies destructive morphological opening/erosion.
    7. Resizes high-precision float mask back to native image dimensions using bilinear interpolation.
    8. Blends with existing alpha channel: min(predicted_alpha, orig_alpha) to strictly preserve transparent regions.
    9. Losslessly composites alpha channel onto original untouched RGBA pixels.
    10. Exports lossless, standard-compliant transparent PNG.
    """
    mem_start = get_memory_mb()
    t0 = time.time()

    if not image_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty image buffer provided")

    try:
        with Image.open(io.BytesIO(image_bytes)) as pil_img:
            orig_w, orig_h = pil_img.size

            # 1. Inspect existing alpha channel if present
            has_alpha = (
                pil_img.mode in ("RGBA", "LA")
                or (pil_img.mode == "P" and "transparency" in pil_img.info)
            )
            if has_alpha:
                orig_rgba = pil_img.convert("RGBA")
                orig_alpha = np.array(orig_rgba.split()[-1])
                # Composite over neutral gray (128, 128, 128) for neural input
                rgb_input = Image.new("RGB", (orig_w, orig_h), (128, 128, 128))
                rgb_input.paste(orig_rgba, mask=orig_rgba.split()[-1])
            else:
                orig_rgba = pil_img.convert("RGBA")
                orig_alpha = None
                rgb_input = pil_img.convert("RGB")

            # 2. Aspect-Ratio Preserving Proportional Letterbox Preprocessing
            target_size = 1024
            scale = min(target_size / orig_w, target_size / orig_h)
            nw = max(1, int(round(orig_w * scale)))
            nh = max(1, int(round(orig_h * scale)))

            scaled = rgb_input.resize((nw, nh), Image.Resampling.BILINEAR)
            del rgb_input

            pad_left = (target_size - nw) // 2
            pad_top = (target_size - nh) // 2

            canvas = Image.new("RGB", (target_size, target_size), (128, 128, 128))
            canvas.paste(scaled, (pad_left, pad_top))
            del scaled

            # 3. Model Preprocessing: float32, range [-0.5, 0.5]
            arr = np.array(canvas, dtype=np.float32)
            tensor = np.transpose((arr / 255.0 - 0.5) / 1.0, (2, 0, 1))[np.newaxis, :, :, :].astype(np.float32)
            del canvas, arr

            t_in_min, t_in_max, t_in_mean = float(tensor.min()), float(tensor.max()), float(tensor.mean())

            # 4. Neural inference
            t_inf_start = time.time()
            outputs = _SESSION.run(None, {_INPUT_NAME: tensor})
            inf_ms = round((time.time() - t_inf_start) * 1000, 1)
            del tensor

            raw_out = outputs[0][0, 0] # (1024, 1024)
            del outputs

            # 5. Extract exact unpadded region corresponding to the un-distorted image
            unpadded_mask = raw_out[pad_top : pad_top + nh, pad_left : pad_left + nw]
            del raw_out

            t_out_min, t_out_max, t_out_mean = float(unpadded_mask.min()), float(unpadded_mask.max()), float(unpadded_mask.mean())

            # 6. Dynamic Calibration
            mi = float(np.min(unpadded_mask))
            ma = float(np.max(unpadded_mask))
            if ma > mi:
                norm_mask = (unpadded_mask - mi) / (ma - mi)
            else:
                norm_mask = unpadded_mask
            del unpadded_mask

            # 7. High-fidelity matting post-processing:
            # Map background floor (< 0.03) smoothly to 0.0 without residual float noise.
            # Confident foreground (> 0.95) achieves full opacity (alpha = 255).
            # Smoothstep S-curve: S(t) = t * t * (3.0 - 2.0 * t) ensures C1-continuous gradients.
            # Preserves delicate hair strands, fingers, clothing borders, and narrow gaps between people.
            # NEVER blind-fills enclosed holes or applies destructive morphological opening/erosion.
            t = np.clip((norm_mask - 0.03) / (0.95 - 0.03), 0.0, 1.0)
            clean_mask = (t * t * (3.0 - 2.0 * t)).astype(np.float32)
            del norm_mask, t

            # 8. Resize continuous float mask back to ORIGINAL image dimensions using Bilinear interpolation
            mask_img = Image.fromarray(clean_mask, mode="F").resize(
                (orig_w, orig_h),
                Image.Resampling.BILINEAR
            )
            del clean_mask

            final_alpha = (np.array(mask_img) * 255.0).round().clip(0, 255).astype(np.uint8)
            del mask_img

            # 9. If original image had an alpha channel, guarantee existing transparency is preserved
            if orig_alpha is not None:
                final_alpha = np.minimum(final_alpha, orig_alpha)
                del orig_alpha

            mask_min = int(final_alpha.min())
            mask_max = int(final_alpha.max())
            mask_mean = float(np.mean(final_alpha))

            # 10. Lossless Alpha Compositing:
            # Original RGBA pixel values are 100% preserved (never converted to black RGB).
            alpha_channel = Image.fromarray(final_alpha, mode="L")
            del final_alpha

            rgba_img = orig_rgba.copy()
            rgba_img.putalpha(alpha_channel)
            del orig_rgba, alpha_channel

            # 11. Export to PNG buffer
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
        "model": _MODEL_NAME_LOADED or "isnet-general-use",
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
            "X-Model-Used": _MODEL_NAME_LOADED or "isnet-general-use",
            "X-Worker-Memory-Mb": str(round(get_memory_mb(), 1))
        }
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
