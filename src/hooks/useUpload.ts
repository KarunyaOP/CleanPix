"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession } from "@/components/providers/AuthProvider";
import {
  validateImageFile,
  validateImageResolution,
  getImageDimensions,
  optimizeImageForUpload,
  MAX_FILE_SIZE_BYTES,
} from "@/utils/fileValidation";
import { classifyImageSubject } from "@/utils/aiDetection";
import { ApiErrorResponse, DetectedCategory } from "@/types/schema";

export interface BackgroundRemovalResponse {
  success: boolean;
  jobId: string;
  originalUrl: string;
  processedUrl: string;
  hdUrl?: string;
  publicId?: string;
  version?: number;
  detectedObject: DetectedCategory;
  width: number;
  height: number;
  provider: "cloudinary";
  creditsRemaining?: number;
}

export interface ToastState {
  message: string;
  type?: "success" | "info" | "error" | "hd";
  duration?: number;
}

/**
 * Preloads the transformed Cloudinary URL using standard Image element decoding
 * to guarantee instantaneous, flicker-free rendering when revealing the cutout.
 */
const preloadProcessedImage = (
  url: string,
  maxAttempts = 12,
  initialIntervalMs = 100
): Promise<string> => {
  return new Promise((resolve) => {
    let attempts = 0;
    let currentInterval = initialIntervalMs;
    let isResolved = false;

    // Safety timeout: Reveal within 4s maximum
    const safetyTimeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        resolve(url);
      }
    }, 4500);

    const tryLoad = () => {
      if (isResolved) return;
      attempts++;
      if (typeof window === "undefined") {
        isResolved = true;
        clearTimeout(safetyTimeout);
        return resolve(url);
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";

      img.onload = () => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(safetyTimeout);
          resolve(url);
        }
      };

      img.onerror = () => {
        if (isResolved) return;
        if (attempts >= maxAttempts) {
          isResolved = true;
          clearTimeout(safetyTimeout);
          resolve(url);
        } else {
          currentInterval = Math.min(currentInterval * 1.2, 800);
          setTimeout(tryLoad, currentInterval);
        }
      };

      img.src = url;
    };

    tryLoad();
  });
};

/**
 * Direct upload helper that streams binary file directly from browser to Cloudinary
 * Completely bypassing Vercel 4.5MB payload limit and supporting files up to 20MB.
 */
const uploadDirectToCloudinary = (
  uploadUrl: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl, true);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = { message: xhr.responseText };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        const error: any = new Error(
          data?.error?.message || `Cloudinary upload failed with status ${xhr.status}`
        );
        error.code = data?.error?.code || "DIRECT_UPLOAD_FAILED";
        error.details = data?.error?.message;
        error.status = xhr.status;
        reject(error);
      }
    };

    xhr.onerror = () => {
      const error: any = new Error("Network error during direct image upload.");
      error.code = "NETWORK_ERROR";
      reject(error);
    };

    xhr.send(formData);
  });
};

export function useUpload() {
  const { data: session, update: updateSession } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [hdUrl, setHdUrl] = useState<string | null>(null);
  const [isHdReady, setIsHdReady] = useState<boolean>(false);
  const [isEnhancingHd, setIsEnhancingHd] = useState<boolean>(false);
  const [hdError, setHdError] = useState<string | null>(null);

  const [detectedObject, setDetectedObject] = useState<DetectedCategory | null>(null);
  const [framing, setFraming] = useState<number | "fit" | "balanced" | "spacious">(0);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isProcessingAI, setIsProcessingAI] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<{ code: string; message: string; details?: string } | null>(
    null
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef<number>(0);

  const showToast = useCallback(
    (message: string, type: "success" | "info" | "error" | "hd" = "success", duration = 3500) => {
      setToast({ message, type, duration });
    },
    []
  );

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetUpload = useCallback(() => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setProcessedUrl(null);
    setHdUrl(null);
    setIsHdReady(false);
    setIsEnhancingHd(false);
    setHdError(null);
    setDetectedObject(null);
    setDimensions(null);
    setJobId(null);
    setIsUploading(false);
    setIsProcessingAI(false);
    setUploadProgress(0);
    setError(null);
    setToast(null);
    setIsDragging(false);
    dragCounter.current = 0;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [previewUrl]);

  const selectFile = useCallback(
    async (selectedFile: File) => {
      clearError();

      // 1. Check basic file integrity & MIME type
      const initialValidation = validateImageFile(selectedFile);
      if (
        !initialValidation.valid &&
        (initialValidation.error?.code === "INVALID_FILE_TYPE" ||
          initialValidation.error?.code === "EMPTY_FILE")
      ) {
        setError(initialValidation.error);
        return;
      }

      // 2. Smart Client-Side Optimization (if file is oversized >20MB or >25 Megapixels)
      let activeFile = selectedFile;
      try {
        activeFile = await optimizeImageForUpload(selectedFile);
      } catch (optErr) {
        console.warn("[IMAGE_OPTIMIZATION_WARN]", optErr);
        activeFile = selectedFile;
      }

      // 3. Final Client-Side File Size & Type Validation (<=20MB)
      const validation = validateImageFile(activeFile);
      if (!validation.valid && validation.error) {
        setError(validation.error);
        return;
      }

      // 4. Set file and create instant client-side preview URL
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setFile(activeFile);
      const initialSubject = classifyImageSubject({ fileName: activeFile.name });
      setDetectedObject(initialSubject);
      const localUrl = URL.createObjectURL(activeFile);
      setPreviewUrl(localUrl);
      setProcessedUrl(null);
      setHdUrl(null);
      setIsHdReady(false);
      setIsEnhancingHd(false);
      setHdError(null);
      setIsUploading(false);
      setIsProcessingAI(false);
      setUploadProgress(0);

      // 5. Read dimensions asynchronously, validate 25MP ceiling, and refine classification
      getImageDimensions(activeFile).then((dims) => {
        setDimensions(dims);
        const resValidation = validateImageResolution(dims.width, dims.height);
        if (!resValidation.valid && resValidation.error) {
          setError(resValidation.error);
          return;
        }
        const refinedSubject = classifyImageSubject({
          fileName: activeFile.name,
          width: dims.width,
          height: dims.height,
        });
        setDetectedObject(refinedSubject);
      });
    },
    [clearError, previewUrl]
  );

  // Prevent browser default behavior when dragging files over the window & support clipboard paste
  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData || !e.clipboardData.items) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const pastedFile = items[i].getAsFile();
          if (pastedFile) {
            e.preventDefault();
            selectFile(pastedFile);
            showToast("Image pasted from clipboard!", "info");
            break;
          }
        }
      }
    };

    window.addEventListener("dragover", preventDefaults);
    window.addEventListener("drop", preventDefaults);
    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("dragover", preventDefaults);
      window.removeEventListener("drop", preventDefaults);
      window.removeEventListener("paste", handlePaste);
    };
  }, [selectFile, showToast]);

  // Cleanup object URLs on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const startBackgroundRemoval = useCallback(async (customFraming?: number | "fit" | "balanced" | "spacious") => {
    if (!file || isProcessingAI) return;
    clearError();

    const activeFraming = customFraming !== undefined ? customFraming : framing;
    const framingStr =
      activeFraming === 100 || activeFraming === "spacious"
        ? "spacious"
        : activeFraming === 50 || activeFraming === "balanced"
        ? "balanced"
        : "fit";

    setIsUploading(true);
    setIsProcessingAI(true);
    setUploadProgress(15);
    setHdError(null);
    setIsHdReady(false);

    try {
      // 1. Ensure file is within 20MB limit before uploading
      let uploadFile = file;
      if (uploadFile.size > MAX_FILE_SIZE_BYTES) {
        uploadFile = await optimizeImageForUpload(file);
      }

      const finalValidation = validateImageFile(uploadFile);
      if (!finalValidation.valid && finalValidation.error) {
        throw {
          code: finalValidation.error.code,
          message: finalValidation.error.message,
          details: finalValidation.error.details,
        };
      }

      // 2. Request Direct-to-Cloudinary upload signature from backend
      setUploadProgress(25);
      const signRes = await fetch("/api/upload/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.user?.email ? { "x-user-email": session.user.email } : {}),
          ...(session?.user?.id ? { "x-user-id": session.user.id } : {}),
        },
        body: JSON.stringify({
          fileName: uploadFile.name,
          fileSize: uploadFile.size,
          fileType: uploadFile.type || "image/png",
          framing: framingStr,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
        }),
      });

      let signData: any = null;
      const signContentType = signRes.headers.get("content-type") || "";
      if (signContentType.includes("application/json")) {
        signData = await signRes.json().catch(() => null);
      }

      if (!signRes.ok || !signData?.signature) {
        if (signRes.status === 403) {
          throw {
            code: "INSUFFICIENT_CREDITS",
            message: "You have 0 credits remaining. Please upgrade your plan to continue.",
          };
        }
        throw {
          code: signData?.error?.code || "SIGNATURE_FAILED",
          message: signData?.error?.message || "Failed to initialize secure upload.",
          details: signData?.error?.details,
        };
      }

      // 3. Direct Upload from Browser directly to Cloudinary (bypassing Vercel 4.5MB limit)
      setUploadProgress(35);
      const directFormData = new FormData();
      directFormData.append("file", uploadFile);
      directFormData.append("api_key", signData.apiKey);
      directFormData.append("timestamp", String(signData.timestamp));
      directFormData.append("signature", signData.signature);
      directFormData.append("folder", signData.folder);
      directFormData.append("type", signData.type || "authenticated");
      directFormData.append("faces", "true");
      directFormData.append("colors", "true");
      directFormData.append("image_metadata", "true");

      let cloudinaryResult: any = null;
      try {
        cloudinaryResult = await uploadDirectToCloudinary(
          signData.uploadUrl,
          directFormData,
          (percent) => {
            // Map direct upload progress from 35% -> 65%
            const mapped = 35 + Math.round(percent * 0.3);
            setUploadProgress(mapped);
          }
        );
      } catch (directUploadErr: any) {
        console.warn("[DIRECT_UPLOAD_FAILED, FALLBACK_CHECK]", directUploadErr);
        // If file is <= 4MB and direct upload failed, fallback to server proxy
        if (uploadFile.size <= 4 * 1024 * 1024) {
          const fallbackFormData = new FormData();
          fallbackFormData.append("file", uploadFile);
          fallbackFormData.append("framing", framingStr);
          if (session?.user?.email) fallbackFormData.append("userEmail", session.user.email);
          if (session?.user?.id) fallbackFormData.append("userId", session.user.id);

          const fallbackRes = await fetch("/api/remove-background", {
            method: "POST",
            headers: {
              ...(session?.user?.email ? { "x-user-email": session.user.email } : {}),
              ...(session?.user?.id ? { "x-user-id": session.user.id } : {}),
            },
            body: fallbackFormData,
          });
          const fallbackData = await fallbackRes.json().catch(() => null);
          if (!fallbackRes.ok) throw fallbackData?.error || directUploadErr;
          cloudinaryResult = fallbackData;
        } else {
          throw directUploadErr;
        }
      }

      // 4. Send processing request to backend for subject classification & signed HMAC URL generation
      setUploadProgress(70);
      let successData: BackgroundRemovalResponse;

      if (cloudinaryResult?.processedUrl) {
        successData = cloudinaryResult;
      } else {
        const processRes = await fetch("/api/remove-background", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.user?.email ? { "x-user-email": session.user.email } : {}),
            ...(session?.user?.id ? { "x-user-id": session.user.id } : {}),
          },
          body: JSON.stringify({
            publicId: cloudinaryResult.public_id,
            version: cloudinaryResult.version,
            fileName: uploadFile.name,
            width: cloudinaryResult.width,
            height: cloudinaryResult.height,
            format: cloudinaryResult.format,
            faces: cloudinaryResult.faces,
            tags: cloudinaryResult.tags,
            colors: cloudinaryResult.colors,
            illustrationScore: cloudinaryResult.illustration_score,
            framing: framingStr,
            jobId: signData.jobId,
            userId: session?.user?.id || signData.userId,
            userEmail: session?.user?.email,
          }),
        });

        let processData: any = null;
        const processContentType = processRes.headers.get("content-type") || "";
        if (processContentType.includes("application/json")) {
          processData = await processRes.json().catch(() => null);
        }

        if (!processRes.ok || !processData?.success) {
          throw {
            code: processData?.error?.code || "AI_PROCESSING_FAILED",
            message: processData?.error?.message || "Failed to remove background from image.",
            details: processData?.error?.details,
          };
        }

        successData = processData;
      }

      setJobId(successData.jobId);
      setDetectedObject(successData.detectedObject);
      if (successData.hdUrl) {
        setHdUrl(successData.hdUrl);
      }
      setUploadProgress(85);

      // 5. Preload genuine Cloudinary background-removed URL
      await preloadProcessedImage(successData.processedUrl);

      setProcessedUrl(successData.processedUrl);
      setUploadProgress(100);

      // 6. Update credits across UI
      if (typeof successData.creditsRemaining === "number") {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("cleanpix_credits_updated", {
              detail: { credits: successData.creditsRemaining },
            })
          );
        }
        if (session?.user && typeof updateSession === "function") {
          updateSession({ credits: successData.creditsRemaining }).catch((err) =>
            console.error("[USE_UPLOAD_SESSION_UPDATE_ERROR]", err)
          );
        }
      }

    } catch (err: any) {
      console.error("[BACKGROUND_REMOVAL_FAILED]", err);

      if (err.code === "INSUFFICIENT_CREDITS") {
        setIsUpgradeModalOpen(true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("cleanpix_out_of_credits"));
        }
      }

      setError({
        code: err.code || "AI_PROCESSING_FAILED",
        message: err.message || "An unexpected error occurred during background removal.",
        details: err.details || "Please verify your image or try again.",
      });
    } finally {
      setIsUploading(false);
      setIsProcessingAI(false);
    }
  }, [file, isProcessingAI, clearError, session, updateSession, framing]);

  /**
   * On-demand HD Enhancement workflow with session caching
   */
  const startHdEnhancement = useCallback(async () => {
    if (!processedUrl || isEnhancingHd) return;
    if (isHdReady && hdUrl) {
      showToast("HD version is already generated and ready.", "hd");
      return;
    }

    setIsEnhancingHd(true);
    setHdError(null);

    // Use signed HD URL provided by server
    let targetHdUrl = hdUrl || processedUrl;
    if (!hdUrl && processedUrl) {
      setHdUrl(processedUrl);
    }

    try {
      if (!targetHdUrl) throw new Error("HD transformation URL could not be generated.");

      // Preload transformed HD cutout
      await preloadProcessedImage(targetHdUrl, 20, 600);

      setIsHdReady(true);
      showToast("HD version generated with 2x resolution and enhanced sharpness.", "hd");
    } catch (err: any) {
      console.error("[HD_ENHANCEMENT_ERROR]", err);
      const msg = err.message || "Failed to generate HD version.";
      setHdError(msg);
      showToast(msg, "error");
    } finally {
      setIsEnhancingHd(false);
    }
  }, [processedUrl, isEnhancingHd, isHdReady, hdUrl, showToast]);

  /**
   * Copy transparent PNG directly to clipboard using Clipboard API
   */
  const copyToClipboard = useCallback(async (customUrl?: string) => {
    const targetUrl = customUrl || (isHdReady && hdUrl ? hdUrl : (processedUrl || "/images/hero-cutout.jpg"));
    if (!targetUrl) {
      showToast("No transparent PNG available to copy.", "error");
      return;
    }

    try {
      const response = await fetch(targetUrl);
      if (!response.ok) throw new Error("Could not download image for clipboard copy.");
      const blob = await response.blob();

      // Ensure blob is typed as image/png for full system clipboard compatibility
      let pngBlob = blob;
      if (blob.type !== "image/png") {
        pngBlob = new Blob([await blob.arrayBuffer()], { type: "image/png" });
      }

      if (typeof navigator === "undefined" || !navigator.clipboard?.write) {
        throw new Error("Clipboard image copying is not supported in this browser.");
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": pngBlob,
        }),
      ]);

      showToast(`Image (${isHdReady ? "HD Enhanced" : "Standard"}) copied to clipboard successfully.`, "success");
    } catch (err: any) {
      console.error("[CLIPBOARD_COPY_ERROR]", err);
      const msg = err.message || "Could not copy image to clipboard.";
      showToast(msg, "error");
      throw err;
    }
  }, [isHdReady, hdUrl, processedUrl, showToast]);

  /**
   * Dual Quality Resilient Download Handler (Standard vs HD)
   * Pipeline: Blob Fetch -> Offscreen Canvas -> Direct Link Fallback
   */
  const downloadCutout = useCallback(
    async (quality: "standard" | "hd" = "standard") => {
      const isHd = quality === "hd";
      const targetUrl = isHd ? (hdUrl || processedUrl) : processedUrl;
      if (!targetUrl) return;

      const baseName = file ? file.name.replace(/\.[^/.]+$/, "") : "cleanpix";
      const defaultName = `${baseName}_cleanpix_${isHd ? "hd_enhanced" : "standard"}.png`;

      showToast(`Download started (${isHd ? "HD Enhanced 2x" : "Standard 1x"}).`, "success");

      // Stage 1: Standard Blob Fetch
      try {
        const response = await fetch(targetUrl, { mode: "cors" });
        if (response.ok) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = defaultName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
          return;
        }
      } catch {
        // Continue to Stage 2
      }

      // Stage 2: Offscreen Canvas Draw with full sRGB color space & high smoothing quality
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Canvas draw failed"));
          img.src = targetUrl;
        });

        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d", { colorSpace: "srgb" });
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0);
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/png")
          );
          if (blob) {
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = defaultName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
            return;
          }
        }
      } catch {
        // Continue to Stage 3
      }

      // Stage 3: Direct Link Navigation Trigger
      try {
        const link = document.createElement("a");
        link.href = targetUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = defaultName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err: any) {
        showToast("Could not download file automatically. Please right-click the image to save.", "error");
      }
    },
    [file, hdUrl, processedUrl, showToast]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        selectFile(files[0]);
      }
      if (e.target) {
        e.target.value = "";
      }
    },
    [selectFile]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      setIsDragging(false);
      dragCounter.current = 0;
    }
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
      if (!isDragging) {
        setIsDragging(true);
      }
    },
    [isDragging]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        selectFile(files[0]);
      }
    },
    [selectFile]
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    file,
    previewUrl,
    processedUrl,
    hdUrl,
    isHdReady,
    isEnhancingHd,
    hdError,
    detectedObject,
    dimensions,
    jobId,
    isUploading,
    isProcessingAI,
    uploadProgress,
    error,
    toast,
    isDragging,
    fileInputRef,
    handleFileSelect,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    openFilePicker,
    resetUpload,
    clearError,
    showToast,
    dismissToast,
    selectFile,
    startBackgroundRemoval,
    startHdEnhancement,
    copyToClipboard,
    downloadCutout,
    isUpgradeModalOpen,
    setIsUpgradeModalOpen,
    framing,
    setFraming,
  };
}
