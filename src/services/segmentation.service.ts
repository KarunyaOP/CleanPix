export class SegmentationService {
  /**
   * Universal Foreground Segmentation Engine powered by dedicated BRIA RMBG 1.4 AI Worker.
   * Transmits image buffer to the dedicated AI Worker service over authenticated HTTP.
   * Completely eliminates local Python spawning and filesystem downloads from Vercel serverless functions.
   */
  static async removeBackground(inputBuffer: Buffer): Promise<Buffer> {
    const workerUrl = (process.env.AI_WORKER_URL || "http://localhost:8000").replace(/\/+$/, "");
    const workerSecret = process.env.AI_WORKER_SECRET || "";
    const endpoint = `${workerUrl}/remove-bg`;

    const headers: Record<string, string> = {
      "Content-Type": "application/octet-stream",
    };

    if (workerSecret) {
      headers["x-api-key"] = workerSecret;
      headers["Authorization"] = `Bearer ${workerSecret}`;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: new Uint8Array(inputBuffer),
        signal: controller.signal,
        cache: "no-store",
      }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `AI Worker HTTP ${response.status}: ${errorText || response.statusText || "Worker failed to segment image"}`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const resultBuffer = Buffer.from(arrayBuffer);

      if (!resultBuffer || resultBuffer.length === 0) {
        throw new Error("AI Worker returned empty cutout buffer");
      }

      return resultBuffer;
    } catch (workerErr: any) {
      const isTimeout = workerErr?.name === "AbortError" || workerErr?.message?.includes("aborted");

      console.error("[AI_WORKER_UNAVAILABLE] Failed to reach or process with AI Worker:", {
        endpoint,
        errorName: workerErr?.name,
        errorMessage: workerErr?.message,
        isTimeout,
        timestamp: new Date().toISOString(),
      });

      const userError: any = new Error(
        "Background removal service is temporarily unavailable. Please try again in a few moments."
      );
      userError.code = "SERVICE_UNAVAILABLE";
      userError.details = isTimeout
        ? "AI Worker request timed out after 30 seconds."
        : workerErr?.message;
      throw userError;
    }
  }

  /**
   * Health check for AI Worker availability
   */
  static async checkWorkerHealth(): Promise<{ ok: boolean; details?: any }> {
    const workerUrl = (process.env.AI_WORKER_URL || "http://localhost:8000").replace(/\/+$/, "");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${workerUrl}/health`, {
        signal: controller.signal,
        cache: "no-store",
      }).finally(() => clearTimeout(timeout));

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        return { ok: true, details: json };
      }
      return { ok: false, details: `HTTP ${res.status}` };
    } catch (e: any) {
      return { ok: false, details: e?.message };
    }
  }
}
