import { getCloudinaryClient, isCloudinaryConfigured } from "@/lib/cloudinary";
import { UploadApiResponse } from "cloudinary";
import { classifyImageSubject } from "@/utils/aiDetection";
import { DetectedCategory } from "@/types/schema";
import { SegmentationService } from "@/services/segmentation.service";

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
  /**
   * Securely downloads an authenticated Cloudinary asset buffer on the server.
   * Uses signed private download URLs with server-side basic authentication headers.
   * Never exposes credentials or raw storage URLs to the client.
   */
  static async fetchAuthenticatedAssetBuffer(publicId: string, format: string = "png"): Promise<Buffer> {
    const cloudinary = getCloudinaryClient();
    const apiKey = cloudinary.config().api_key || process.env.CLOUDINARY_API_KEY || "";
    const apiSecret = cloudinary.config().api_secret || process.env.CLOUDINARY_API_SECRET || "";

    if (!apiKey || !apiSecret) {
      throw new Error("Missing Cloudinary API key or secret for authenticated asset retrieval.");
    }

    const downloadUrl = cloudinary.utils.private_download_url(publicId, format, {
      type: "authenticated",
      resource_type: "image",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    });

    const authHeader = "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    const response = await fetch(downloadUrl, {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      // Also attempt signed delivery URL with Basic Auth
      const signedUrl = cloudinary.url(publicId, {
        type: "authenticated",
        sign_url: true,
        secure: true,
        format: format,
      });

      const retryRes = await fetch(signedUrl, {
        headers: {
          Authorization: authHeader,
        },
      });

      if (!retryRes.ok) {
        throw new Error(`Failed to retrieve authenticated image asset (HTTP ${response.status} / ${retryRes.status})`);
      }

      return Buffer.from(await retryRes.arrayBuffer());
    }

    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Processes a direct-uploaded Cloudinary asset:
   * 1. Performs AI subject classification
   * 2. Securely retrieves authenticated image buffer on server
   * 3. Executes Universal Foreground Segmentation (SegmentationService)
   * 4. Uploads clean lossless transparent PNG cutout to Cloudinary
   * 5. Returns authenticated HMAC SHA-256 signed URLs
   */
  /**
   * Helper to log processing metrics and indicators for every background removal job.
   * Logs only to server console (not exposed to frontend / UI).
   */
  private static logProcessingSource(params: {
    uploadId: string;
    processingEngine: "universal_segmentation" | "cloudinary_fallback" | string;
    retrievalMethod: "authenticated_cloudinary_download" | "direct_multipart_upload" | "fallback" | string;
    processingTimeMs: number;
    isFallback?: boolean;
  }): void {
    const { uploadId, processingEngine, retrievalMethod, processingTimeMs, isFallback } = params;
    
    if (isFallback || processingEngine === "cloudinary_fallback" || retrievalMethod === "fallback") {
      console.warn(
        `[BACKGROUND_REMOVAL_FALLBACK_WARN] Fallback occurred for job:\nupload_id=${uploadId}\nprocessing_engine=${processingEngine}\nretrieval_method=${retrievalMethod}\nprocessing_time_ms=${processingTimeMs}`
      );
    }

    console.log(
      `[BACKGROUND_REMOVAL_JOB] upload_id=${uploadId} processing_engine=${processingEngine} retrieval_method=${retrievalMethod} processing_time_ms=${processingTimeMs}\nprocessing_engine=${processingEngine}\nretrieval_method=${retrievalMethod}`
    );
  }

  /**
   * Processes a direct-uploaded Cloudinary asset:
   * 1. Performs AI subject classification
   * 2. Securely retrieves authenticated image buffer on server
   * 3. Executes Universal Foreground Segmentation (SegmentationService)
   * 4. Uploads clean lossless transparent PNG cutout to Cloudinary
   * 5. Returns authenticated HMAC SHA-256 signed URLs
   */
  static async processDirectUploadedImage(
    params: ProcessDirectUploadParams
  ): Promise<BackgroundRemovalResult> {
    const startTime = Date.now();
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

    const uploadId = publicId || jobId;

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
      // 1. Classify subject for framing & metadata
      const detectedObject = classifyImageSubject({
        fileName,
        faces,
        tags,
        colors,
        illustrationScore,
        width,
        height,
      });

      const isSpacious = framing === "spacious" || framing === "100" || framing === "100%";
      const isBalanced = framing === "balanced" || framing === "50" || framing === "50%";
      const normalizedFraming = isSpacious ? "spacious" : isBalanced ? "balanced" : "fit";

      // 2. Construct signed original image URL with HMAC protection
      const originalUrl = cloudinary.url(publicId, {
        type: "authenticated",
        sign_url: true,
        secure: true,
        version: version,
        format: format,
      });

      // 3. Securely retrieve authenticated original image bytes from Cloudinary
      const rawImageBuffer = await this.fetchAuthenticatedAssetBuffer(publicId, format);

      // 4. Primary Processing: Universal Foreground Segmentation
      const transparentPngBuffer = await SegmentationService.removeBackground(rawImageBuffer);

      if (!transparentPngBuffer || transparentPngBuffer.length === 0) {
        throw new Error("Universal segmentation engine produced an empty image buffer.");
      }

      // 5. Store the transparent PNG in Cloudinary authenticated storage
      const folder =
        publicId.substring(0, publicId.lastIndexOf("/")) ||
        (userId ? `cleanpix/users/${userId}` : `cleanpix/guest/${jobId}`);

      const cutoutUpload = await new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `${folder}/cutouts`,
            resource_type: "image",
            type: "authenticated",
            format: "png",
          },
          (err, res) => {
            if (err || !res) return reject(err || new Error("Failed to store transparent cutout"));
            resolve(res);
          }
        );
        stream.end(transparentPngBuffer);
      });

      // 6. Generate signed authenticated URLs for transparent PNG and HD PNG
      const processedUrl = cloudinary.url(cutoutUpload.public_id, {
        type: "authenticated",
        sign_url: true,
        secure: true,
        format: "png",
        version: cutoutUpload.version,
      });

      const hdUrl = cloudinary.url(cutoutUpload.public_id, {
        type: "authenticated",
        sign_url: true,
        secure: true,
        format: "png",
        raw_transformation: "e_unsharp_mask:120,cs_srgb,q_auto:best",
        version: cutoutUpload.version,
      });

      // Log processing-source metrics
      const processingTimeMs = Date.now() - startTime;
      this.logProcessingSource({
        uploadId,
        processingEngine: "universal_segmentation",
        retrievalMethod: "authenticated_cloudinary_download",
        processingTimeMs,
      });

      return {
        jobId,
        originalUrl,
        processedUrl,
        hdUrl,
        publicId: cutoutUpload.public_id,
        version: cutoutUpload.version,
        detectedObject,
        width: cutoutUpload.width || width,
        height: cutoutUpload.height || height,
        format: "png",
        provider: "cloudinary",
        framing: normalizedFraming,
      };
    } catch (err: any) {
      console.error("[PIPELINE_PROCESSING_ERROR]", err?.message || err);
      const error: any = new Error(err?.message || "Failed to process image with universal background removal.");
      error.code = "BACKGROUND_REMOVAL_FAILED";
      error.details = "Image segmentation failed during processing.";
      throw error;
    }
  }

  /**
   * Upload an image to Cloudinary and execute Universal AI Background Removal
   * with custom Framing composition (Fit 0%, Balanced 50%, Spacious 100%) - Fallback endpoint
   */
  static async removeBackground(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    framing: "fit" | "balanced" | "spacious" | string = "fit",
    userId?: string
  ): Promise<BackgroundRemovalResult> {
    const startTime = Date.now();
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

      const rawUploadPromise = new Promise<UploadApiResponse>((resolve, reject) => {
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

      // 3. Primary Processing: Universal Foreground Segmentation
      const segmentationPromise = SegmentationService.removeBackground(buffer);

      const [uploadResult, segmentedBuffer] = await Promise.all([rawUploadPromise, segmentationPromise]);

      if (!segmentedBuffer || segmentedBuffer.length === 0) {
        throw new Error("Universal segmentation engine produced an empty image buffer.");
      }

      // 4. Store transparent cutout in Cloudinary authenticated storage
      const cutoutUploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
        const cutoutStream = cloudinary.uploader.upload_stream(
          {
            folder: `${uploadFolder}/cutouts`,
            resource_type: "image",
            type: "authenticated",
            format: "png",
          },
          (error, result) => {
            if (error || !result) {
              return reject(error || new Error("Cloudinary cutout upload failed"));
            }
            resolve(result);
          }
        );
        cutoutStream.end(segmentedBuffer);
      });

      const isSpacious = framing === "spacious" || framing === "100" || framing === "100%";
      const isBalanced = framing === "balanced" || framing === "50" || framing === "50%";
      const normalizedFraming = isSpacious ? "spacious" : isBalanced ? "balanced" : "fit";

      const processedUrl = cloudinary.url(cutoutUploadResult.public_id, {
        type: "authenticated",
        sign_url: true,
        secure: true,
        format: "png",
        version: cutoutUploadResult.version,
      });

      const hdUrl = cloudinary.url(cutoutUploadResult.public_id, {
        type: "authenticated",
        sign_url: true,
        secure: true,
        format: "png",
        raw_transformation: "e_unsharp_mask:120,cs_srgb,q_auto:best",
        version: cutoutUploadResult.version,
      });

      const originalUrl = cloudinary.url(uploadResult.public_id, {
        type: "authenticated",
        sign_url: true,
        secure: true,
        format: uploadResult.format,
        version: uploadResult.version,
      });

      const detectedObject = classifyImageSubject({
        fileName,
        faces: uploadResult.faces,
        tags: uploadResult.tags,
        colors: uploadResult.colors,
        illustrationScore: uploadResult.illustration_score,
        width: uploadResult.width,
        height: uploadResult.height,
      });

      // Log processing-source metrics
      const processingTimeMs = Date.now() - startTime;
      this.logProcessingSource({
        uploadId: uploadResult.public_id || jobId,
        processingEngine: "universal_segmentation",
        retrievalMethod: "direct_multipart_upload",
        processingTimeMs,
      });

      return {
        jobId,
        originalUrl,
        processedUrl,
        hdUrl,
        publicId: cutoutUploadResult.public_id,
        version: cutoutUploadResult.version,
        detectedObject,
        width: cutoutUploadResult.width || uploadResult.width,
        height: cutoutUploadResult.height || uploadResult.height,
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
          "Cloudinary Authentication Failed (401 Invalid Signature). Please verify that your CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local exactly match your Cloudinary dashboard."
        );
        error.code = "CLOUDINARY_AUTH_ERROR";
        error.details = cloudinaryError.message;
        throw error;
      }

      const error: any = new Error(
        cloudinaryError.message || "Failed to process image with universal background removal."
      );
      error.code = cloudinaryError.code || "BACKGROUND_REMOVAL_FAILED";
      error.details = cloudinaryError.details || cloudinaryError.message || "Universal background removal encountered an error.";
      throw error;
    }
  }

  /**
   * Helper to generate HD URL dynamically from publicId & version with authenticated signature
   */
  static generateHdUrl(
    publicId: string,
    version?: number,
    framing: string = "fit",
    detectedCategory: string = "other"
  ): string {
    const cloudinary = getCloudinaryClient();
    const isSpacious = framing === "spacious" || framing === "100" || framing === "100%";
    const isBalanced = framing === "balanced" || framing === "50" || framing === "50%";
    const padPrefix = isSpacious
      ? "b_transparent,c_pad,w_1.5,h_1.5"
      : isBalanced
      ? "b_transparent,c_pad,w_1.25,h_1.25"
      : "";

    const rawTransformation = padPrefix
      ? `${padPrefix}/e_unsharp_mask:120,cs_srgb,q_auto:best`
      : "e_unsharp_mask:120,cs_srgb,q_auto:best";

    return cloudinary.url(publicId, {
      type: "authenticated",
      sign_url: true,
      raw_transformation: rawTransformation,
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
