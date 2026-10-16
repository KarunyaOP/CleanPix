FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    MODEL_DIR=/app/models \
    MODEL_NAME=isnet-general-use.onnx \
    MODEL_PATH=/app/models/isnet-general-use.onnx

WORKDIR /app

# Install curl for healthchecks and downloading model
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the IS-Net General Use model during Docker build for instant cold starts
RUN mkdir -p /app/models && \
    curl -L "https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx" -o /app/models/isnet-general-use.onnx

# Copy application source code
COPY main.py .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
