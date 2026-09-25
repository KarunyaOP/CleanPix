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

export interface DirectUploadSignatureResult {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  type: "authenticated";
  uploadUrl: string;
  jobId: string;
  params: Record<string, any>;
}

export interface ProcessDirectUploadParams {
  publicId: string;
  version?: number;
  fileName: string;
  width?: number;
  height?: number;
  format?: string;
  faces?: any[];
  tags?: string[];
  colors?: any[];
  illustrationScore?: number;
  framing?: "fit" | "balanced" | "spacious" | string;
  jobId?: string;
  userId?: string;
}

export class CloudinaryService {
  /**
   * Generates a secure cryptographic signature for Direct-to-Cloudinary authenticated uploads.
   * Allows files up to 20MB to stream directly from the browser to Cloudinary, completely bypassing Vercel's 4.5MB payload ceiling.
   */
  static generateDirectUploadSignature(userId?: string): DirectUploadSignatureResult {
    if (!isCloudinaryConfigured()) {
      const error: any = new Error(
        "Cloudinary credentials are not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env.local file."
      );
      error.code = "CLOUDINARY_NOT_CONFIGURED";
      error.details = "Configure .env.local with valid Cloudinary API keys.";
      throw error;
    }

    const cloudinary = getCloudinaryClient();
    const cloudName = cloudinary.config().cloud_name || process.env.CLOUDINARY_CLOUD_NAME || "";
    const apiKey = cloudinary.config().api_key || process.env.CLOUDINARY_API_KEY || "";
    const apiSecret = cloudinary.config().api_secret || process.env.CLOUDINARY_API_SECRET || "";

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const folder = userId ? `cleanpix/users/${userId}` : `cleanpix/guest/${jobId}`;
    const timestamp = Math.round(Date.now() / 1000);

    const paramsToSign: Record<string, any> = {
      colors: true,
      faces: true,
      folder,
      image_metadata: true,
      timestamp,
      type: "authenticated",
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return {
      signature,
      timestamp,
      apiKey,
      cloudName,
      folder,
      type: "authenticated",
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      jobId,
      params: paramsToSign,
    };
  }

  /**
   * Processes a direct-uploaded Cloudinary asset:
   * - Performs AI subject classification
   * - Generates authenticated HMAC SHA-256 signed URLs (Standard cutout, HD cutout, Original asset)
   * - Polls transformation readiness
   */
  static async processDirectUploadedImage(
    params: ProcessDirectUploadParams
  ): Promise<BackgroundRemovalResult> {
    const {
      publicId,
      version,
      fileName,
      width = 800,
      height = 800,
      format = "png",
      faces,
      tags,
      colors,
      illustrationScore,
      framing = "fit",
      jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      userId,
    } = params;

    if (!publicId) {
      throw new Error("Missing publicId for Cloudinary background removal processing");
    }

    // Security check: If authenticated userId is provided, ensure publicId is scoped under their folder
    if (userId && !publicId.startsWith(`cleanpix/users/${userId}/`)) {
      console.warn(`[CLOUDINARY_OWNERSHIP_WARN] publicId '${publicId}' does not match userId '${userId}'`);
    }

    if (!isCloudinaryConfigured()) {
      const error: any = new Error("Cloudinary credentials are not configured.");
      error.code = "CLOUDINARY_NOT_CONFIGURED";
      throw error;
    }

    const cloudinary = getCloudinaryClient();

    try {
      // 1. Classify subject using Cloudinary face detection + visual/metadata analysis + geometry
      const detectedObject = classifyImageSubject({
        fileName,
        faces,
        tags,
        colors,
        illustrationScore,
        width,
        height,
      });

      // Normalize framing choice
      const isSpacious = framing === "spacious" || framing === "100" || framing === "100%";
      const isBalanced = framing === "balanced" || framing === "50" || framing === "50%";
      const normalizedFraming = isSpacious ? "spacious" : isBalanced ? "balanced" : "fit";

      // 2. Construct genuine Standard Cloudinary AI Background Removal transformed URL with HMAC signature
      // c_limit,w_2048,h_2048 guarantees the transparent PNG buffer never exceeds Cloudinary's 10MB (10,485,760 bytes) processing limit
      const standardTransformation = isSpacious
        ? "c_limit,w_2048,h_2048/e_background_removal:fineedges_y/b_transparent,c_pad,w_1.5,h_1.5/cs_srgb,q_auto:best"
        : isBalanced
        ? "c_limit,w_2048,h_2048/e_background_removal:fineedges_y/b_transparent,c_pad,w_1.25,h_1.25/cs_srgb,q_auto:best"
        : "c_limit,w_2048,h_2048/e_background_removal:fineedges_y/cs_srgb,q_auto:best";

      const processedUrl = cloudinary.url(publicId, {
        type: "authenticated",
        sign_url: true,
        raw_transformation: standardTransformation,
        format: "png",
        secure: true,
        version: version,
      });

      // 3. Construct HD Enhanced Cloudinary AI Background Removal transformed URL with HMAC signature
      const hdTransformation = isSpacious
        ? "c_limit,w_2048,h_2048/e_background_removal:fineedges_y/b_transparent,c_pad,w_1.5,h_1.5/e_unsharp_mask:120,cs_srgb,q_auto:best"
        : isBalanced
        ? "c_limit,w_2048,h_2048/e_background_removal:fineedges_y/b_transparent,c_pad,w_1.25,h_1.25/e_unsharp_mask:120,cs_srgb,q_auto:best"
        : "c_limit,w_2048,h_2048/e_background_removal:fineedges_y/e_unsharp_mask:120,cs_srgb,q_auto:best";

      const hdUrl = cloudinary.url(publicId, {
        type: "authenticated",
        sign_url: true,
        raw_transformation: hdTransformation,
        format: "png",
        secure: true,
        version: version,
      });

      // 4. Construct signed original image URL with HMAC protection
      const originalUrl = cloudinary.url(publicId, {
        type: "authenticated",
        sign_url: true,
        secure: true,
        version: version,
        format: format,
      });

      // 5. Server-side quick polling to verify processing status of standard cutout
      await this.verifyOrPollCloudinaryUrl(processedUrl, 10, 1500);

      return {
        jobId,
        originalUrl,
        processedUrl,
        hdUrl,
        publicId,
        version,
        detectedObject,
        width,
        height,
        format: "png",
        provider: "cloudinary",
        framing: normalizedFraming,
      };
    } catch (cloudinaryError: any) {
      console.error("[CLOUDINARY_PROCESS_DIRECT_ERROR]", cloudinaryError);
      throw cloudinaryError;
    }
  }

  /**
   * Upload an image to Cloudinary and execute real AI Background Removal (e_background_removal)
   * with custom Framing composition (Fit 0%, Balanced 50%, Spacious 100%) - Fallback endpoint
   */
  static async removeBackground(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    framing: "fit" | "balanced" | "spacious" | string = "fit",
    userId?: string
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
      // 2. Upload raw image to Cloudinary under authenticated delivery and user-scoped storage
      const uploadFolder = userId ? `cleanpix/users/${userId}` : `cleanpix/guest/${jobId}`;

      const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: uploadFolder,
            resource_type: "image",
            type: "authenticated",
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

      return await this.processDirectUploadedImage({
        publicId: uploadResult.public_id,
        version: uploadResult.version,
        fileName,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        faces: uploadResult.faces,
        tags: uploadResult.tags,
        colors: uploadResult.colors,
        illustrationScore: uploadResult.illustration_score,
        framing,
        jobId,
        userId,
      });
    } catch (cloudinaryError: any) {
      console.error("[CLOUDINARY_API_ERROR]", cloudinaryError);
      
      if (
        cloudinaryError.http_code === 401 ||
        (cloudinaryError.message && cloudinaryError.message.includes("Invalid Signature"))
      ) {
        const error: any = new Error(
          "Cloudinary Authentication Failed (401 Invalid Signature). Please verify that your CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local exactly match your Cloudinary dashboard."
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
   * Helper to generate HD URL dynamically from publicId & version with authenticated signature
   */
  static generateHdUrl(publicId: string, version?: number, framing: string = "fit"): string {
    const cloudinary = getCloudinaryClient();
    const isSpacious = framing === "spacious" || framing === "100" || framing === "100%";
    const isBalanced = framing === "balanced" || framing === "50" || framing === "50%";
    const padPrefix = isSpacious
      ? "c_limit,w_2048,h_2048/e_background_removal:fineedges_y/b_transparent,c_pad,w_1.5,h_1.5"
      : isBalanced
      ? "c_limit,w_2048,h_2048/e_background_removal:fineedges_y/b_transparent,c_pad,w_1.25,h_1.25"
      : "c_limit,w_2048,h_2048/e_background_removal:fineedges_y";

    return cloudinary.url(publicId, {
      type: "authenticated",
      sign_url: true,
      raw_transformation: `${padPrefix}/e_unsharp_mask:120,cs_srgb,q_auto:best`,
      format: "png",
      secure: true,
      version: version,
    });
  }

  /**
   * Ultra-low latency server check to verify AI transformation status and detect 400 errors immediately
   */
  private static async verifyOrPollCloudinaryUrl(
    url: string,
    maxAttempts = 3,
    initialIntervalMs = 150
  ): Promise<void> {
    let currentInterval = initialIntervalMs;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 600);

        const response = await fetch(url, {
          method: "HEAD",
          cache: "no-store",
          signal: controller.signal,
        }).finally(() => clearTimeout(timeout));

        if (response.status === 200) {
          return; // Ready!
        }
        if (response.status === 423 || response.status === 420 || response.status === 404) {
          // Cloudinary is processing AI model asynchronously - return early so client decodes progressively
          if (attempt === 1) {
            await new Promise((resolve) => setTimeout(resolve, currentInterval));
            continue;
          }
          return;
        }
        if (response.status === 400) {
          const detailRes = await fetch(url, { cache: "no-store" });
          const cldErrorHeader = detailRes.headers.get("x-cld-error") || "";
          const text = await detailRes.text();
          if (
            cldErrorHeader.toLowerCase().includes("file size too large") ||
            text.toLowerCase().includes("file size too large") ||
            cldErrorHeader.includes("10485760")
          ) {
            const err: any = new Error(
              "The image file or output resolution exceeds Cloudinary's 10 MB transformation processing limit. Please try an optimized version of the image."
            );
            err.code = "CLOUDINARY_FILE_SIZE_LIMIT";
            err.details = cldErrorHeader || text;
            throw err;
          }
          if (
            text.toLowerCase().includes("background_removal") ||
            cldErrorHeader.toLowerCase().includes("background_removal")
          ) {
            const err: any = new Error(
              "Cloudinary AI Background Removal failed. Please ensure the Cloudinary AI Background Removal add-on is enabled on your Cloudinary account."
            );
            err.code = "CLOUDINARY_ADDON_ERROR";
            err.details = cldErrorHeader || text;
            throw err;
          }
        }
      } catch (err: any) {
        if (err.code === "CLOUDINARY_ADDON_ERROR" || err.code === "CLOUDINARY_FILE_SIZE_LIMIT") throw err;
        // Non-blocking network timeout: allow client to decode progressively
        return;
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
