FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    MODEL_DIR=/app/models \
    MODEL_PATH=/app/models/rmbg-1.4.onnx

WORKDIR /app

# Install curl for healthchecks and downloading model
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the BRIA RMBG 1.4 model during Docker build for instant cold starts
RUN mkdir -p /app/models && \
    curl -L "https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx" -o /app/models/rmbg-1.4.onnx

# Copy application source code
COPY main.py .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
