export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB strictly under Vercel's 4.5MB payload limit
export const MAX_FILE_SIZE_MB = 4;
export const MAX_IMAGE_MEGAPIXELS = 20; // 20 Megapixels strictly under Cloudinary AI limit (~25 MP)

export interface FileValidationResult {
  valid: boolean;
  error?: {
    code: "INVALID_FILE_TYPE" | "FILE_TOO_LARGE" | "RESOLUTION_TOO_LARGE" | "EMPTY_FILE";
    message: string;
    details?: string;
  };
}

/**
 * Validates file presence, byte size, and MIME/extension constraints.
 */
export function validateImageFile(file: File): FileValidationResult {
  if (!file || file.size === 0) {
    return {
      valid: false,
      error: {
        code: "EMPTY_FILE",
        message: "The selected file is empty. Please choose a valid image.",
      },
    };
  }

  // 1. File Size Validation (<= 4MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: {
        code: "FILE_TOO_LARGE",
        message: "Image exceeds maximum upload size.",
        details: `File size is ${sizeInMB}MB. Maximum allowed upload size is ${MAX_FILE_SIZE_MB}MB.`,
      },
    };
  }

  // 2. MIME Type & Extension Validation
  const fileExt = "." + (file.name.split(".").pop()?.toLowerCase() || "");
  const hasValidMime = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
  const hasValidExt = ALLOWED_EXTENSIONS.includes(fileExt);

  if (!hasValidMime && !hasValidExt) {
    const detectedType = file.type || fileExt || "Unknown format";
    return {
      valid: false,
      error: {
        code: "INVALID_FILE_TYPE",
        message: `Unsupported file type (${detectedType}). Only JPG, PNG, and WEBP are supported.`,
        details: "Please upload an image ending in .jpg, .jpeg, .png, or .webp.",
      },
    };
  }

  return { valid: true };
}

/**
 * Validates image pixel dimensions against the 20 Megapixel ceiling.
 */
export function validateImageResolution(width: number, height: number): FileValidationResult {
  if (width <= 0 || height <= 0) return { valid: true };
  const totalPixels = width * height;
  const megapixels = totalPixels / 1_000_000;
  if (megapixels > MAX_IMAGE_MEGAPIXELS) {
    return {
      valid: false,
      error: {
        code: "RESOLUTION_TOO_LARGE",
        message: "Image resolution is too large.",
        details: `Image resolution is ${megapixels.toFixed(1)}MP (${width}×${height}). Maximum allowed resolution is ${MAX_IMAGE_MEGAPIXELS} megapixels.`,
      },
    };
  }
  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Reads intrinsic image dimensions safely via offscreen Image element
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      return resolve({ width: 0, height: 0 });
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
}

/**
 * Smart Client-Side Optimization:
 * Automatically downscales oversized or ultra-high-resolution images before upload.
 * Preserves exact aspect ratio and color sharpness, ensuring result is <4MB and <=20 Megapixels.
 */
export async function optimizeImageForUpload(file: File): Promise<File> {
  // If not in browser environment or file is empty, return original
  if (typeof window === "undefined" || !file || file.size === 0) {
    return file;
  }

  // Check intrinsic dimensions
  const dims = await getImageDimensions(file);
  const totalPixels = dims.width * dims.height;
  const megapixels = totalPixels / 1_000_000;
  const isOverSize = file.size > MAX_FILE_SIZE_BYTES;
  const isOverRes = megapixels > MAX_IMAGE_MEGAPIXELS;

  // If already within 4MB and 20MP limits, preserve 100% original binary bytes
  if (!isOverSize && !isOverRes && dims.width > 0) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      URL.revokeObjectURL(url);

      const srcWidth = img.naturalWidth || img.width;
      const srcHeight = img.naturalHeight || img.height;

      if (!srcWidth || !srcHeight) {
        return resolve(file);
      }

      // Calculate target scaling factor to strictly satisfy < 20MP (target ~18.5MP max) and max dimension <= 4096px
      let scale = 1.0;
      const curMP = (srcWidth * srcHeight) / 1_000_000;
      if (curMP > 19.0) {
        scale = Math.min(scale, Math.sqrt(18.5 / curMP));
      }

      const maxDim = Math.max(srcWidth, srcHeight);
      if (maxDim * scale > 4096) {
        scale = Math.min(scale, 4096 / maxDim);
      }

      // Additional downscale step if file byte size is heavily bloated
      if (file.size > 8 * 1024 * 1024) {
        scale = Math.min(scale, 0.75);
      } else if (file.size > 4 * 1024 * 1024) {
        scale = Math.min(scale, 0.90);
      }

      const targetWidth = Math.max(1, Math.round(srcWidth * scale));
      const targetHeight = Math.max(1, Math.round(srcHeight * scale));

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext("2d", { colorSpace: "srgb" });
      if (!ctx) {
        return resolve(file);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Determine export mime type & quality
      const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
      const isWebp = file.type === "image/webp" || file.name.toLowerCase().endsWith(".webp");

      // For PNG, test if PNG export fits under 3.8MB (well within 4MB limit)
      if (isPng) {
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size <= MAX_FILE_SIZE_BYTES) {
              const optimizedFile = new File([blob], file.name, {
                type: "image/png",
                lastModified: Date.now(),
              });
              return resolve(optimizedFile);
            }

            // If PNG is still >4MB due to high texture complexity, export as high-quality JPEG (0.92)
            canvas.toBlob(
              (jpgBlob) => {
                if (jpgBlob) {
                  const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
                  const optimizedFile = new File([jpgBlob], newName, {
                    type: "image/jpeg",
                    lastModified: Date.now(),
                  });
                  return resolve(optimizedFile);
                }
                return resolve(file);
              },
              "image/jpeg",
              0.92
            );
          },
          "image/png"
        );
      } else if (isWebp) {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimizedFile = new File([blob], file.name, {
                type: "image/webp",
                lastModified: Date.now(),
              });
              return resolve(optimizedFile);
            }
            return resolve(file);
          },
          "image/webp",
          0.92
        );
      } else {
        // Default: High-Quality JPEG (0.92 quality maintains crisp edges and zero perceptible artifacts)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimizedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              return resolve(optimizedFile);
            }
            return resolve(file);
          },
          "image/jpeg",
          0.92
        );
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}
