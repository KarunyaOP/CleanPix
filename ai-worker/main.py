import os
import sys
import io
import time
import urllib.request
import traceback
from contextlib import asynccontextmanager
import numpy as np
from PIL import Image
import onnxruntime as ort
from fastapi import FastAPI, Request, Response, HTTPException, Header, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

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

def ensure_model():
    global _SESSION, _INPUT_NAME
    os.makedirs(MODEL_DIR, exist_ok=True)
    if not os.path.exists(MODEL_PATH) or os.path.getsize(MODEL_PATH) < 100000000:
        print(f"[AI-WORKER] Downloading BRIA RMBG-1.4 model from {MODEL_URL} to {MODEL_PATH} ...", flush=True)
        t0 = time.time()
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print(f"[AI-WORKER] Model downloaded in {time.time() - t0:.2f}s ({os.path.getsize(MODEL_PATH)} bytes)", flush=True)
    else:
        print(f"[AI-WORKER] Model verified on disk: {MODEL_PATH} ({os.path.getsize(MODEL_PATH)} bytes)", flush=True)

    print("[AI-WORKER] Initializing ONNX Runtime session...", flush=True)
    session_opts = ort.SessionOptions()
    session_opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    session_opts.intra_op_num_threads = max(1, os.cpu_count() or 4)

    available_providers = ort.get_available_providers()
    providers = ['CPUExecutionProvider']
    if 'CUDAExecutionProvider' in available_providers:
        providers.insert(0, 'CUDAExecutionProvider')

    _SESSION = ort.InferenceSession(MODEL_PATH, session_opts, providers=providers)
    _INPUT_NAME = _SESSION.get_inputs()[0].name
    print(f"[AI-WORKER] Session initialized successfully! Providers: {_SESSION.get_providers()}, Input: {_INPUT_NAME}", flush=True)

    # Warm-up inference
    print("[AI-WORKER] Warming up model with dummy tensor...", flush=True)
    dummy_input = np.zeros((1, 3, 1024, 1024), dtype=np.float32)
    _SESSION.run(None, {_INPUT_NAME: dummy_input})
    print("[AI-WORKER] Warm-up complete! Service is ready for high-speed inference.", flush=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load model once
    ensure_model()
    yield
    # Shutdown
    print("[AI-WORKER] Shutting down AI worker...", flush=True)

app = FastAPI(
    title="CleanPix AI Segmentation Microservice",
    description="Dedicated High-Precision Background Removal Microservice using BRIA RMBG 1.4",
    version="1.0.0",
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

def process_segmentation(image_bytes: bytes) -> bytes:
    if not image_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty image buffer provided")

    try:
        orig_img = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid image format: {e}")

    rgb_img = orig_img.convert("RGB")
    orig_w, orig_h = rgb_img.size

    # Standard RMBG-1.4 Preprocessing
    work_img = rgb_img.resize((1024, 1024), Image.Resampling.BILINEAR)
    img_arr = np.array(work_img, dtype=np.float32) / 255.0

    # RMBG-1.4 normalization: (x - 0.5) / 1.0
    norm_arr = (img_arr - 0.5) / 1.0
    input_tensor = np.transpose(norm_arr, (2, 0, 1))[np.newaxis, :, :, :].astype(np.float32)

    # In-memory neural inference
    outputs = _SESSION.run(None, {_INPUT_NAME: input_tensor})
    raw_mask = outputs[0][0, 0] # (1024, 1024)

    # Min-max normalization
    mi = float(np.min(raw_mask))
    ma = float(np.max(raw_mask))
    if ma > mi:
        norm_mask = (raw_mask - mi) / (ma - mi)
    else:
        norm_mask = raw_mask

    # Scale to 8-bit alpha mask and resize to original resolution
    mask_arr = (np.clip(norm_mask, 0.0, 1.0) * 255.0).astype(np.uint8)
    alpha_channel = Image.fromarray(mask_arr, mode="L").resize((orig_w, orig_h), Image.Resampling.BILINEAR)

    # Merge RGBA
    r, g, b = rgb_img.split()
    cutout = Image.merge("RGBA", (r, g, b, alpha_channel))

    out_io = io.BytesIO()
    cutout.save(out_io, format="PNG", optimize=True)
    return out_io.getvalue()

@app.get("/")
@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "CleanPix AI Segmentation Worker",
        "model": "BRIA RMBG 1.4",
        "model_loaded": _SESSION is not None,
        "providers": _SESSION.get_providers() if _SESSION else [],
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

    t0 = time.time()
    try:
        png_cutout_bytes = process_segmentation(image_bytes)
        elapsed_ms = round((time.time() - t0) * 1000, 1)
        
        return Response(
            content=png_cutout_bytes,
            media_type="image/png",
            headers={
                "X-Processing-Time-Ms": str(elapsed_ms),
                "X-Model-Used": "BRIA-RMBG-1.4"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AI-WORKER_ERROR] {e}", flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Segmentation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
