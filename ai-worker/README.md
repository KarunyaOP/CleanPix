# CleanPix AI Segmentation Microservice (BRIA RMBG 1.4)

High-performance, dedicated AI background removal microservice running BRIA RMBG 1.4 via ONNX Runtime.

## API Endpoints

- `GET /health`: Health check and model readiness status.
- `POST /remove-bg`: Accepts raw image buffer or multipart form data; returns transparent lossless PNG.

## Environment Variables

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `PORT` | Optional | Port to listen on (default `8000`) | `8000` |
| `AI_WORKER_SECRET` | Optional | Shared authentication secret | `cleanpix_secret_key_abc123` |

---

## Deployment Options

### 1. Deploy on Railway (Recommended - 2 Minutes)
1. Log in to [railway.app](https://railway.app).
2. Click **New Project** > **Deploy from GitHub Repo**.
3. Select your CleanPix repository.
4. Set **Root Directory** to `ai-worker`.
5. Under **Variables**, optionally set `AI_WORKER_SECRET`.
6. Railway automatically builds the Dockerfile and assigns a public URL (e.g. `https://cleanpix-ai-worker.up.railway.app`).

### 2. Deploy on Render
1. Log in to [render.com](https://render.com).
2. Click **New +** > **Web Service**.
3. Connect your CleanPix repository.
4. Set **Root Directory** to `ai-worker`.
5. Select **Environment**: **Docker**.
6. Set **Health Check Path** to `/health`.
7. Click **Create Web Service**.

### 3. Deploy on VPS (Docker / Ubuntu)
```bash
cd ai-worker
docker build -t cleanpix-ai-worker .
docker run -d -p 8000:8000 --restart always --name cleanpix-ai cleanpix-ai-worker
```

---

## Next.js Integration

In your Next.js application (e.g. on Vercel), add these environment variables:

```env
AI_WORKER_URL=https://cleanpix-ai-worker.up.railway.app
AI_WORKER_SECRET=cleanpix_secret_key_abc123
```
