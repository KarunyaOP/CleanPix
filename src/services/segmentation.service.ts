import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { PNG } from "pngjs";

export class SegmentationService {
  /**
   * Universal Foreground Segmentation Engine.
   * Isolates arbitrary foreground subjects (anime art, cartoon characters, logos, products, stickers, game art, portraits, pets, vehicles, food)
   * and outputs a pristine lossless transparent PNG buffer.
   */
  static async removeBackground(inputBuffer: Buffer): Promise<Buffer> {
    // 1. Attempt Python-based segmentation first
    try {
      const pythonResult = await this.runPythonSegmentation(inputBuffer);
      if (pythonResult && pythonResult.length > 0) {
        return pythonResult;
      }
    } catch (pythonErr) {
      console.warn("[SEGMENTATION_PYTHON_FALLBACK]", pythonErr);
    }

    // 2. Pure Node.js high-performance fallback using pngjs
    return await this.runNodeSegmentation(inputBuffer);
  }

  /**
   * Run Python segmentation process via child_process
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
          reject(new Error(`Python segmentation exited with code ${code}: ${errMsg}`));
        }
      });

      py.on("error", (err) => reject(err));

      py.stdin.write(inputBuffer);
      py.stdin.end();
    });
  }

  /**
   * Pure Node.js segmentation fallback using multi-seed boundary flood-fill on PNG pixels
   */
  private static async runNodeSegmentation(inputBuffer: Buffer): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const png = new PNG();

      png.parse(inputBuffer, (err, data) => {
        if (err) {
          return reject(err);
        }

        const width = data.width;
        const height = data.height;
        const pixels = data.data;

        // Sample boundary colors to establish background color model
        const boundaryColors: Array<[number, number, number]> = [];
        const stepX = Math.max(1, Math.floor(width / 40));
        const stepY = Math.max(1, Math.floor(height / 40));

        for (let x = 0; x < width; x += stepX) {
          const idxTop = (x) * 4;
          const idxBottom = ((height - 1) * width + x) * 4;
          boundaryColors.push([pixels[idxTop], pixels[idxTop + 1], pixels[idxTop + 2]]);
          boundaryColors.push([pixels[idxBottom], pixels[idxBottom + 1], pixels[idxBottom + 2]]);
        }

        for (let y = 0; y < height; y += stepY) {
          const idxLeft = (y * width) * 4;
          const idxRight = (y * width + (width - 1)) * 4;
          boundaryColors.push([pixels[idxLeft], pixels[idxLeft + 1], pixels[idxLeft + 2]]);
          boundaryColors.push([pixels[idxRight], pixels[idxRight + 1], pixels[idxRight + 2]]);
        }

        let avgR = 0, avgG = 0, avgB = 0;
        for (const [r, g, b] of boundaryColors) {
          avgR += r;
          avgG += g;
          avgB += b;
        }
        avgR /= boundaryColors.length;
        avgG /= boundaryColors.length;
        avgB /= boundaryColors.length;

        // Flood fill queue from borders
        const visited = new Uint8Array(width * height);
        const queue: number[] = [];

        const isBgColor = (r: number, g: number, b: number) => {
          // Euclidean distance from boundary average
          const dist = Math.sqrt((r - avgR) ** 2 + (g - avgG) ** 2 + (b - avgB) ** 2);
          return dist < 45;
        };

        // Seed all perimeter pixels
        for (let x = 0; x < width; x++) {
          queue.push(x, (height - 1) * width + x);
          visited[x] = 1;
          visited[(height - 1) * width + x] = 1;
        }
        for (let y = 0; y < height; y++) {
          const idxL = y * width;
          const idxR = y * width + (width - 1);
          if (!visited[idxL]) { queue.push(idxL); visited[idxL] = 1; }
          if (!visited[idxR]) { queue.push(idxR); visited[idxR] = 1; }
        }

        let qHead = 0;
        while (qHead < queue.length) {
          const curr = queue[qHead++];
          const cx = curr % width;
          const cy = Math.floor(curr / width);
          const pIdx = curr * 4;

          const cr = pixels[pIdx];
          const cg = pixels[pIdx + 1];
          const cb = pixels[pIdx + 2];

          if (isBgColor(cr, cg, cb)) {
            // Mark transparent
            pixels[pIdx + 3] = 0;

            // Check 4 neighbors
            const neighbors = [
              cx > 0 ? curr - 1 : -1,
              cx < width - 1 ? curr + 1 : -1,
              cy > 0 ? curr - width : -1,
              cy < height - 1 ? curr + width : -1,
            ];

            for (const n of neighbors) {
              if (n >= 0 && !visited[n]) {
                visited[n] = 1;
                queue.push(n);
              }
            }
          }
        }

        // Pack back into buffer
        const outChunks: Buffer[] = [];
        data.pack()
          .on("data", (chunk: Buffer) => outChunks.push(chunk))
          .on("end", () => resolve(Buffer.concat(outChunks)))
          .on("error", (e) => reject(e));
      });
    });
  }
}
