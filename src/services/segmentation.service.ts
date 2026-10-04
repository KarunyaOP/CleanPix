import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export class SegmentationService {
  /**
   * Universal Foreground Segmentation Engine powered exclusively by BRIA RMBG 1.4 ONNX.
   * If the model cannot be loaded or inference fails, it throws a controlled error
   * without silent degradation to heuristic fallbacks.
   */
  static async removeBackground(inputBuffer: Buffer): Promise<Buffer> {
    try {
      const pythonResult = await this.runPythonSegmentation(inputBuffer);
      if (pythonResult && pythonResult.length > 0) {
        return pythonResult;
      }
      throw new Error("Empty segmentation buffer returned by model.");
    } catch (modelErr: any) {
      // Log model-loading / inference failure internally
      console.error("[SEGMENTATION_MODEL_FAILURE] BRIA RMBG 1.4 execution error:", {
        message: modelErr?.message,
        stack: modelErr?.stack,
        timestamp: new Date().toISOString(),
      });

      // Return a controlled user-facing processing error
      const error: any = new Error(
        "Background removal service is temporarily unavailable. Please try again in a few moments."
      );
      error.code = "SERVICE_UNAVAILABLE";
      error.details = modelErr?.message;
      throw error;
    }
  }

  /**
   * Run Python BRIA RMBG segmentation process via child_process
   */
  private static async runPythonSegmentation(inputBuffer: Buffer): Promise<Buffer> {
    const scriptPath = path.join(process.cwd(), "src", "scripts", "segment_image.py");
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Python segmentation script not found at: ${scriptPath}`);
    }

    return new Promise<Buffer>((resolve, reject) => {
      const py = spawn("python", [scriptPath], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      const chunks: Buffer[] = [];
      const errorChunks: Buffer[] = [];

      py.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
      py.stderr.on("data", (chunk: Buffer) => errorChunks.push(chunk));

      py.on("close", (code) => {
        if (code === 0 && chunks.length > 0) {
          resolve(Buffer.concat(chunks));
        } else {
          const errMsg = Buffer.concat(errorChunks).toString("utf8");
          reject(new Error(`Python segmentation failed (exit code ${code}): ${errMsg}`));
        }
      });

      py.on("error", (err) => reject(err));

      py.stdin.write(inputBuffer);
      py.stdin.end();
    });
  }
}
