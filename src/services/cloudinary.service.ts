import { getCloudinaryClient, isCloudinaryConfigured } from "@/lib/cloudinary";
import { UploadApiResponse } from "cloudinary";
import { classifyImageSubject } from "@/utils/aiDetection";
import { DetectedCategory } from "@/types/schema";

export interface BackgroundRemovalResult {
  jobId: string;
  originalUrl: string;
  processedUrl: string;
  hdUrl: string;
  publicId: string;
  version?: number;
  detectedObject: DetectedCategory;
  width: number;
  height: number;
  format: string;
  provider: "cloudinary";
  framing?: string;
}

export class CloudinaryService {
  /**
   * Upload an image to Cloudinary and execute real AI Background Removal (e_background_removal)
   * with custom Framing composition (Fit 0%, Balanced 50%, Spacious 100%)
   */
  static async removeBackground(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    framing: "fit" | "balanced" | "spacious" | string = "fit"
  ): Promise<BackgroundRemovalResult> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // 1. Verify Cloudinary credentials in server environment
    if (!isCloudinaryConfigured()) {
      const error: any = new Error(
        "Cloudinary credentials are not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (or CLOUDINARY_URL) to your .env.local file to enable AI background removal."
      );
      error.code = "CLOUDINARY_NOT_CONFIGURED";
      error.details = "Configure .env.local with valid Cloudinary API keys.";
      throw error;
    }

    const cloudinary = getCloudinaryClient();

    try {
      // 2. Upload raw image to Cloudinary with face and metadata detection enabled
      const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "cleanpix/uploads",
            resource_type: "image",
            faces: true,
            colors: true,
            image_metadata: true,
          },
          (error, result) => {
            if (error || !result) {
              return reject(error || new Error("Cloudinary upload failed with empty response"));
            }
            resolve(result);
          }
        );
        uploadStream.end(buffer);
      });

      // 3. Classify dominant subject using Cloudinary face detection + visual/metadata analysis + geometry
      const detectedObject = classifyImageSubject({
        fileName,
        faces: uploadResult.faces,
        tags: uploadResult.tags,
        colors: uploadResult.colors,
        illustrationScore: uploadResult.illustration_score,
        width: uploadResult.width,
        height: uploadResult.height,
      });

      // Normalize framing choice
      const isSpacious = framing === "spacious" || framing === "100" || framing === "100%";
      const isBalanced = framing === "balanced" || framing === "50" || framing === "50%";
      const normalizedFraming = isSpacious ? "spacious" : isBalanced ? "balanced" : "fit";

      // 4. Construct genuine Standard Cloudinary AI Background Removal transformed URL with fine edge and color space preservation
      // Fit (0%): tight framing with fine edges
      // Balanced (50%): 25% extra canvas with b_transparent,c_pad
      // Spacious (100%): 50% extra canvas with b_transparent,c_pad
      const standardTransformation = isSpacious
        ? "e_background_removal:fineedges_y/b_transparent,c_pad,w_1.5,h_1.5/cs_srgb,q_100"
        : isBalanced
        ? "e_background_removal:fineedges_y/b_transparent,c_pad,w_1.25,h_1.25/cs_srgb,q_100"
        : "e_background_removal:fineedges_y/cs_srgb,q_100";

      const processedUrl = cloudinary.url(uploadResult.public_id, {
        raw_transformation: standardTransformation,
        format: "png",
        secure: true,
        version: uploadResult.version,
      });

      // 5. Construct HD Enhanced Cloudinary AI Background Removal transformed URL:
      // Preserves original contrast and color vibrancy via cs_srgb + 2x DPR resolution + clean unsharp mask (e_unsharp_mask:120) + lossless 100% PNG quality
      const hdTransformation = isSpacious
        ? "e_background_removal:fineedges_y/b_transparent,c_pad,w_1.5,h_1.5/dpr_2.0,e_unsharp_mask:120,cs_srgb,q_100"
        : isBalanced
        ? "e_background_removal:fineedges_y/b_transparent,c_pad,w_1.25,h_1.25/dpr_2.0,e_unsharp_mask:120,cs_srgb,q_100"
        : "e_background_removal:fineedges_y/dpr_2.0,e_unsharp_mask:120,cs_srgb,q_100";

      const hdUrl = cloudinary.url(uploadResult.public_id, {
        raw_transformation: hdTransformation,
        format: "png",
        secure: true,
        version: uploadResult.version,
      });

      // 6. Construct raw original image URL for comparison slider (original background intact)
      const originalUrl = cloudinary.url(uploadResult.public_id, {
        secure: true,
        version: uploadResult.version,
        format: uploadResult.format,
      });

      // 7. Server-side quick polling to verify processing status of standard cutout
      await this.verifyOrPollCloudinaryUrl(processedUrl, 10, 1500);

      return {
        jobId,
        originalUrl,
        processedUrl,
        hdUrl,
        publicId: uploadResult.public_id,
        version: uploadResult.version,
        detectedObject,
        width: uploadResult.width || 800,
        height: uploadResult.height || 800,
        format: "png",
        provider: "cloudinary",
        framing: normalizedFraming,
      };
    } catch (cloudinaryError: any) {
      console.error("[CLOUDINARY_API_ERROR]", cloudinaryError);
      
      if (
        cloudinaryError.http_code === 401 ||
        (cloudinaryError.message && cloudinaryError.message.includes("Invalid Signature"))
      ) {
        const error: any = new Error(
          "Cloudinary Authentication Failed (401 Invalid Signature). Please verify that your CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local exactly match your Cloudinary dashboard (or use the one-click CLOUDINARY_URL variable from the Cloudinary dashboard)."
        );
        error.code = "CLOUDINARY_AUTH_ERROR";
        error.details = cloudinaryError.message;
        throw error;
      }

      const error: any = new Error(
        cloudinaryError.message || "Failed to process image with Cloudinary AI background removal."
      );
      error.code = cloudinaryError.code || "CLOUDINARY_PROCESSING_ERROR";
      error.details = cloudinaryError.details || cloudinaryError.message || "Cloudinary API returned an error.";
      throw error;
    }
  }

  /**
   * Helper to generate HD URL dynamically from publicId & version
   */
  static generateHdUrl(publicId: string, version?: number, framing: string = "fit"): string {
    const cloudinary = getCloudinaryClient();
    const isSpacious = framing === "spacious" || framing === "100" || framing === "100%";
    const isBalanced = framing === "balanced" || framing === "50" || framing === "50%";
    const padPrefix = isSpacious
      ? "e_background_removal:fineedges_y/b_transparent,c_pad,w_1.5,h_1.5"
      : isBalanced
      ? "e_background_removal:fineedges_y/b_transparent,c_pad,w_1.25,h_1.25"
      : "e_background_removal:fineedges_y";

    return cloudinary.url(publicId, {
      raw_transformation: `${padPrefix}/dpr_2.0,e_sharpen:100,e_improve,q_auto:best`,
      format: "png",
      secure: true,
      version: version,
    });
  }

  /**
   * Quick polling on server to check if Cloudinary has finished the AI transformation
   */
  private static async verifyOrPollCloudinaryUrl(
    url: string,
    maxAttempts = 8,
    intervalMs = 1200
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(url, { method: "HEAD", cache: "no-store" });
        if (response.status === 200) {
          return; // Ready!
        }
        if (response.status === 423 || response.status === 420 || response.status === 404) {
          // Cloudinary is processing AI model asynchronously
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, intervalMs));
            continue;
          }
        }
        if (response.status === 400) {
          const detailRes = await fetch(url, { cache: "no-store" });
          const text = await detailRes.text();
          if (text.toLowerCase().includes("background_removal")) {
            const err: any = new Error(
              "Cloudinary AI Background Removal failed. Please ensure the Cloudinary AI Background Removal add-on is enabled on your Cloudinary account."
            );
            err.code = "CLOUDINARY_ADDON_ERROR";
            err.details = text;
            throw err;
          }
        }
      } catch (err: any) {
        if (err.code === "CLOUDINARY_ADDON_ERROR") throw err;
      }
    }
  }

  /**
   * Heuristic subject classifier for initial smart suggestions
   */
  static classifySubject(fileName: string): DetectedCategory {
    return classifyImageSubject({ fileName });
  }
}
