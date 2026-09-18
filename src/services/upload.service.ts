import { validateImageFile } from "@/utils/fileValidation";
import { UploadedFileMetadata } from "@/types/schema";

// Ephemeral in-memory store for guest upload jobs (MVP Phase 2)
// In production, backed by Cloudflare R2 / S3 temporary storage with 24h TTL
interface JobStoreItem {
  metadata: UploadedFileMetadata;
  buffer: Buffer;
}

const jobMemoryStore = new Map<string, JobStoreItem>();

export class UploadService {
  /**
   * Process and store an incoming uploaded file
   */
  static async processUpload(file: File): Promise<UploadedFileMetadata> {
    // 1. Validate file constraints
    const validation = validateImageFile(file);
    if (!validation.valid && validation.error) {
      const err = new Error(validation.error.message);
      (err as any).code = validation.error.code;
      (err as any).details = validation.error.details;
      throw err;
    }

    // 2. Generate unique jobId
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 3. Read buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Create base64 Data URL for ephemeral guest preview
    const base64 = buffer.toString("base64");
    const originalUrl = `data:${file.type};base64,${base64}`;

    const metadata: UploadedFileMetadata = {
      jobId,
      originalUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "image/png",
      createdAt: new Date().toISOString(),
    };

    // Store in ephemeral memory
    jobMemoryStore.set(jobId, {
      metadata,
      buffer,
    });

    return metadata;
  }

  /**
   * Retrieve uploaded file metadata by jobId
   */
  static getJob(jobId: string): UploadedFileMetadata | null {
    const item = jobMemoryStore.get(jobId);
    return item ? item.metadata : null;
  }

  /**
   * Remove job from store
   */
  static removeJob(jobId: string): boolean {
    return jobMemoryStore.delete(jobId);
  }
}
