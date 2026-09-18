export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_FILE_SIZE_MB = 10;

export interface FileValidationResult {
  valid: boolean;
  error?: {
    code: "INVALID_FILE_TYPE" | "FILE_TOO_LARGE" | "EMPTY_FILE";
    message: string;
    details?: string;
  };
}

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

  // 1. File Size Validation
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: {
        code: "FILE_TOO_LARGE",
        message: `File is too large (${sizeInMB}MB). Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`,
        details: `Please compress or resize your image to under ${MAX_FILE_SIZE_MB}MB.`,
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

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      return resolve({ width: 0, height: 0 });
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
}
