import { z } from "zod";

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB (Cloudinary AI Background Removal Limit)
export const MAX_FILE_SIZE_MB = 10;

export const FileUploadSchema = z.object({
  file: z.custom<File>((val) => val instanceof File, "A file is required"),
});

export interface UploadedFileMetadata {
  jobId: string;
  originalUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  createdAt: string;
}

export interface ApiErrorResponse {
  error: {
    code: "INVALID_FILE_TYPE" | "FILE_TOO_LARGE" | "NO_FILE_PROVIDED" | "AI_PROCESSING_FAILED" | "INTERNAL_ERROR";
    message: string;
    details?: string;
  };
}

export interface ApiUploadSuccessResponse {
  success: true;
  jobId: string;
  originalUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  processedUrl?: string;
  hdUrl?: string;
  publicId?: string;
  version?: number;
}

export type DetectedCategory =
  | "person"
  | "product"
  | "pet"
  | "vehicle"
  | "food"
  | "document"
  | "logo"
  | "screenshot"
  | "illustration"
  | "other";

export interface SmartBackgroundPreset {
  id: string;
  name: string;
  category: DetectedCategory | "all";
  type: "color" | "gradient" | "pattern" | "image";
  value: string;
  previewBg: string;
  textColor?: string;
  description?: string;
}

export type SocialKitFormatId =
  | "instagram-post"
  | "instagram-story"
  | "youtube-thumbnail"
  | "linkedin-profile";

export interface SocialKitFormat {
  id: SocialKitFormatId;
  name: string;
  platform: "Instagram" | "YouTube" | "LinkedIn";
  aspectRatio: string;
  width: number;
  height: number;
  description: string;
  iconName: string;
}

export interface ExportQualityOption {
  type: "standard" | "hd";
  title: string;
  label: string;
  badge: string;
  width: number;
  height: number;
  fileSize: number;
  formattedSize: string;
  url: string;
  isReady: boolean;
  isProcessing?: boolean;
}
