import os
import sys
import io
import time
import traceback
import urllib.request
import numpy as np
from PIL import Image

# Configure UTF-8 encoding for standard streams
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Global singleton session & model constants
MODEL_DIR = os.path.join(os.path.expanduser("~"), ".cleanpix", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "rmbg-1.4.onnx")
MODEL_URL = "https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx"

_SESSION = None
_INPUT_NAME = None

def get_bria_session():
    """
    Load BRIA RMBG 1.4 ONNX model once at startup as a singleton session.
    """
    global _SESSION, _INPUT_NAME
    if _SESSION is not None:
        return _SESSION, _INPUT_NAME

    import onnxruntime as ort

    os.makedirs(MODEL_DIR, exist_ok=True)
    if not os.path.exists(MODEL_PATH) or os.path.getsize(MODEL_PATH) < 100000000:
        sys.stderr.write(f"[CleanPix] Downloading BRIA RMBG-1.4 ONNX model to {MODEL_PATH}...\n")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        sys.stderr.write(f"[CleanPix] BRIA RMBG-1.4 model cached ({os.path.getsize(MODEL_PATH)} bytes)\n")

    session_opts = ort.SessionOptions()
    session_opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    session_opts.intra_op_num_threads = max(1, os.cpu_count() or 4)

    session = ort.InferenceSession(MODEL_PATH, session_opts, providers=['CPUExecutionProvider'])
    input_name = session.get_inputs()[0].name

    _SESSION = session
    _INPUT_NAME = input_name
    return _SESSION, _INPUT_NAME

def segment_image_bria(img: Image.Image) -> Image.Image:
    """
    Universal High-Precision Background Removal Engine using BRIA RMBG 1.4.
    Processes any subject (anime/manga artwork, game characters, portraits, pets,
    products, logos, vehicles, stickers, food) identically with no category branching.
    """
    session, input_name = get_bria_session()

    rgb_img = img.convert("RGB")
    orig_w, orig_h = rgb_img.size

    # Standard RMBG-1.4 input resolution: 1024x1024
    work_img = rgb_img.resize((1024, 1024), Image.Resampling.BILINEAR)
    img_arr = np.array(work_img, dtype=np.float32) / 255.0

    # RMBG-1.4 normalization: (x - 0.5) / 1.0 (mean=0.5, std=1.0)
    norm_arr = (img_arr - 0.5) / 1.0
    input_tensor = np.transpose(norm_arr, (2, 0, 1))[np.newaxis, :, :, :].astype(np.float32)

    # ONNX Neural Inference
    outputs = session.run(None, {input_name: input_tensor})
    raw_mask = outputs[0][0, 0] # shape (1024, 1024)

    # Min-max normalization
    mi = float(np.min(raw_mask))
    ma = float(np.max(raw_mask))
    if ma > mi:
        norm_mask = (raw_mask - mi) / (ma - mi)
    else:
        norm_mask = raw_mask

    # Scale to 8-bit alpha mask and restore original dimensions
    mask_arr = (np.clip(norm_mask, 0.0, 1.0) * 255.0).astype(np.uint8)
    alpha_channel = Image.fromarray(mask_arr, mode="L").resize((orig_w, orig_h), Image.Resampling.BILINEAR)

    # Merge original RGB channels with pristine alpha channel
    r, g, b = rgb_img.split()
    return Image.merge("RGBA", (r, g, b, alpha_channel))

def segment_image_stream(input_bytes: bytes) -> bytes:
    """
    Universal Segmentation Stream Processor for CleanPix.
    Strictly uses BRIA RMBG 1.4. If the model fails or cannot be loaded,
    raises an exception without fallback.
    """
    try:
        img = Image.open(io.BytesIO(input_bytes))
        out_img = segment_image_bria(img)
        out_io = io.BytesIO()
        out_img.save(out_io, format="PNG", optimize=True)
        return out_io.getvalue()
    except Exception as e:
        sys.stderr.write(f"[BRIA_RMBG_MODEL_ERROR] {e}\n")
        traceback.print_exc(file=sys.stderr)
        raise

def main():
    try:
        if len(sys.argv) < 3:
            input_data = sys.stdin.buffer.read()
            if input_data:
                out = segment_image_stream(input_data)
                sys.stdout.buffer.write(out)
            return

        in_file = sys.argv[1]
        out_file = sys.argv[2]
        with open(in_file, "rb") as f:
            input_bytes = f.read()

        output_bytes = segment_image_stream(input_bytes)
        with open(out_file, "wb") as f:
            f.write(output_bytes)
    except Exception as fatal_err:
        sys.stderr.write(f"[BRIA_RMBG_FATAL_EXIT] {fatal_err}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
