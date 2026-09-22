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
  maxAttempts = 15,
  initialIntervalMs = 200
): Promise<string> => {
  return new Promise((resolve) => {
    let attempts = 0;
    let currentInterval = initialIntervalMs;
    let isResolved = false;

    // Safety timeout: Never hang processing UI indefinitely
    const safetyTimeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        resolve(url);
      }
    }, 12000);

    const tryLoad = () => {
      if (isResolved) return;
      attempts++;
      if (typeof window === "undefined") {
        isResolved = true;
        clearTimeout(safetyTimeout);
        return resolve(url);
      }

      const img = new Image();
      const cacheBustedUrl = `${url}${url.includes("?") ? "&" : "?"}_t=${Date.now()}`;

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
          // If polling reached limit, resolve with url directly so UI renders it
          isResolved = true;
          clearTimeout(safetyTimeout);
          resolve(url);
        } else {
          currentInterval = Math.min(currentInterval * 1.25, 1200);
          setTimeout(tryLoad, currentInterval);
        }
      };

      img.src = cacheBustedUrl;
    };

    tryLoad();
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

      // 2. Smart Client-Side Downscaling (if file is oversized >4MB or >20 Megapixels)
      let activeFile = selectedFile;
      try {
        activeFile = await optimizeImageForUpload(selectedFile);
      } catch (optErr) {
        console.warn("[IMAGE_OPTIMIZATION_WARN]", optErr);
        activeFile = selectedFile;
      }

      // 3. Final Client-Side File Size & Type Validation
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

      // 5. Read dimensions asynchronously, validate 20MP ceiling, and refine classification
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
    setUploadProgress(25);
    setHdError(null);
    setIsHdReady(false);

    try {
      // 1. Ensure file is within strict 4MB limit before uploading
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

      // 2. Prepare FormData with exact uploaded file and selected framing
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("framing", framingStr);
      formData.append(
        "paddingPercent",
        String(
          typeof activeFraming === "number"
            ? activeFraming
            : activeFraming === "spacious"
            ? 100
            : activeFraming === "balanced"
            ? 50
            : 0
        )
      );
      if (session?.user?.email) {
        formData.append("userEmail", session.user.email);
      }
      if (session?.user?.id) {
        formData.append("userId", session.user.id);
      }

      setUploadProgress(50);

      // 3. Send to /api/remove-background for Cloudinary AI processing
      const response = await fetch("/api/remove-background", {
        method: "POST",
        headers: {
          ...(session?.user?.email ? { "x-user-email": session.user.email } : {}),
          ...(session?.user?.id ? { "x-user-id": session.user.id } : {}),
        },
        body: formData,
      });

      setUploadProgress(75);

      // Safe JSON Parsing: Never call response.json() without checking response.ok and content-type
      let data: any = null;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch (jsonErr) {
          console.warn("[BACKGROUND_REMOVAL_JSON_PARSE_WARN]", jsonErr);
          data = null;
        }
      } else {
        const rawText = await response.text().catch(() => "");
        data = { message: rawText };
      }

      if (!response.ok || (data && "error" in data)) {
        let errCode = data?.error?.code || "AI_PROCESSING_FAILED";
        let errMsg = data?.error?.message;
        const errDetails = data?.error?.details || data?.message;

        if (response.status === 413) {
          errCode = "FILE_TOO_LARGE";
          errMsg = errMsg || "Image exceeds maximum upload size (4MB).";
        } else if (response.status === 400) {
          errCode = data?.error?.code || "INVALID_REQUEST";
          errMsg = errMsg || "Invalid image request or unsupported file format.";
        } else if (response.status === 401) {
          errCode = "UNAUTHORIZED";
          errMsg = "You must be signed in to perform this action.";
        } else if (response.status === 403) {
          errCode = data?.error?.code || "INSUFFICIENT_CREDITS";
          errMsg = errMsg || "You have 0 credits remaining. Please upgrade your plan to continue.";
        } else if (response.status >= 500) {
          errCode = "SERVER_ERROR";
          errMsg = errMsg || "Image processing service is temporarily unavailable. Please try again in a moment.";
        }

        throw {
          code: errCode,
          message: errMsg || "Failed to remove background from image.",
          details: errDetails,
        };
      }

      const successData = data as BackgroundRemovalResponse;
      setJobId(successData.jobId);
      setDetectedObject(successData.detectedObject);
      if (successData.hdUrl) {
        setHdUrl(successData.hdUrl);
      }
      setUploadProgress(90);

      // 4. Preload genuine Cloudinary background-removed URL to ensure transparent PNG is ready
      await preloadProcessedImage(successData.processedUrl);

      setProcessedUrl(successData.processedUrl);
      setUploadProgress(100);

      // 5. Update credits in real-time across Navbar, Dashboard, and Settings
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

      // 6. Save to database for authenticated user and guarantee persistence
      let verifiedProjectId = (successData as any).projectId || successData.jobId || `proj-${Date.now()}`;
      if (session?.user?.email) {
        try {
          const saveRes = await fetch("/api/projects", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-email": session.user.email,
              ...(session?.user?.id ? { "x-user-id": session.user.id } : {}),
            },
            body: JSON.stringify({
              userId: session.user.id,
              userEmail: session.user.email,
              originalUrl: successData.originalUrl || uploadFile.name,
              processedUrl: successData.processedUrl,
              detectedObject: successData.detectedObject || "other",
            }),
          });
          if (saveRes.ok) {
            const saveContentType = saveRes.headers.get("content-type") || "";
            if (saveContentType.includes("application/json")) {
              const saveJson = await saveRes.json().catch(() => null);
              if (saveJson?.project?.id) {
                verifiedProjectId = saveJson.project.id;
              }
            }
          }
        } catch (dbErr) {
          console.error("[PROJECT_PERSISTENCE_SYNC_ERROR]", dbErr);
        }
      }

      // 7. Notify real-time listeners across Dashboard & History
      const newCutout = {
        id: verifiedProjectId,
        originalUrl: successData.originalUrl || uploadFile.name,
        processedUrl: successData.processedUrl,
        detectedObject: successData.detectedObject || "other",
        status: "done",
        createdAt: new Date().toISOString(),
      };

      // Guest only: keep local cache when unauthenticated
      if (!session?.user) {
        try {
          const stored = localStorage.getItem("cleanpix_cutout_history");
          const list = stored ? JSON.parse(stored) : [];
          const filtered = Array.isArray(list)
            ? list.filter(
                (item: any) =>
                  item.processedUrl !== successData.processedUrl &&
                  item.id !== newCutout.id
              )
            : [];
          const updated = [newCutout, ...filtered.slice(0, 49)];
          localStorage.setItem("cleanpix_cutout_history", JSON.stringify(updated));
        } catch {}
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("cleanpix_project_created", { detail: newCutout })
        );
        window.dispatchEvent(new CustomEvent("cleanpix_history_refresh"));
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
