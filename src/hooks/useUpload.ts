"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { validateImageFile, getImageDimensions } from "@/utils/fileValidation";
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
 * Polls the transformed Cloudinary URL to ensure the alpha background removal
 * or HD transformation is completely rendered and available with status 200 before releasing the UI loader.
 */
const pollForProcessedImage = (
  url: string,
  maxAttempts = 30,
  intervalMs = 1000
): Promise<string> => {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const checkStatus = async () => {
      attempts++;
      try {
        const cacheBustedUrl = `${url}${url.includes("?") ? "&" : "?"}_cb=${Date.now()}`;
        const response = await fetch(cacheBustedUrl, { method: "HEAD", cache: "no-store" });

        if (response.status === 200) {
          // Verify browser decoding
          const img = new Image();
          img.onload = () => resolve(url);
          img.onerror = () => {
            if (attempts >= maxAttempts) {
              reject(new Error("Image processing completed but failed to render in browser."));
            } else {
              setTimeout(checkStatus, intervalMs);
            }
          };
          img.src = cacheBustedUrl;
          return;
        }

        if (response.status === 423 || response.status === 420 || response.status === 404) {
          // Cloudinary AI background removal or HD rendering is in progress
          if (attempts >= maxAttempts) {
            reject(
              new Error(
                "Image processing timed out. Cloudinary AI is taking longer than expected. Please try again."
              )
            );
          } else {
            setTimeout(checkStatus, intervalMs);
          }
          return;
        }

        if (response.status >= 400) {
          reject(
            new Error(
              `Cloudinary returned status ${response.status}. Please check your Cloudinary AI Background Removal add-on.`
            )
          );
          return;
        }

        // Other unexpected status, retry until maxAttempts
        if (attempts >= maxAttempts) {
          reject(new Error("Image processing could not be completed."));
        } else {
          setTimeout(checkStatus, intervalMs);
        }
      } catch (err: any) {
        if (attempts >= maxAttempts) {
          reject(new Error(err.message || "Network error while polling image result."));
        } else {
          setTimeout(checkStatus, intervalMs);
        }
      }
    };

    checkStatus();
  });
};

export function useUpload() {
  const { update: updateSession } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [hdUrl, setHdUrl] = useState<string | null>(null);
  const [isHdReady, setIsHdReady] = useState<boolean>(false);
  const [isEnhancingHd, setIsEnhancingHd] = useState<boolean>(false);
  const [hdError, setHdError] = useState<string | null>(null);

  const [detectedObject, setDetectedObject] = useState<DetectedCategory | null>(null);
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
    (selectedFile: File) => {
      clearError();

      // 1. Client-Side Validation
      const validation = validateImageFile(selectedFile);
      if (!validation.valid && validation.error) {
        setError(validation.error);
        return;
      }

      // 2. Set file and create instant client-side preview URL
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setFile(selectedFile);
      const initialSubject = classifyImageSubject({ fileName: selectedFile.name });
      setDetectedObject(initialSubject);
      const localUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(localUrl);
      setProcessedUrl(null);
      setHdUrl(null);
      setIsHdReady(false);
      setIsEnhancingHd(false);
      setHdError(null);
      setIsUploading(false);
      setIsProcessingAI(false);
      setUploadProgress(0);

      // Read dimensions asynchronously and refine classification with geometry heuristics
      getImageDimensions(selectedFile).then((dims) => {
        setDimensions(dims);
        const refinedSubject = classifyImageSubject({
          fileName: selectedFile.name,
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

  const startBackgroundRemoval = useCallback(async () => {
    if (!file || isProcessingAI) return;
    clearError();

    setIsUploading(true);
    setIsProcessingAI(true);
    setUploadProgress(25);
    setHdError(null);
    setIsHdReady(false);

    try {
      // 1. Prepare FormData with exact uploaded file
      const formData = new FormData();
      formData.append("file", file);

      setUploadProgress(50);

      // 2. Send to /api/remove-background for Cloudinary AI processing
      const response = await fetch("/api/remove-background", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(75);

      const data: BackgroundRemovalResponse | ApiErrorResponse = await response.json();

      if (!response.ok || "error" in data) {
        const errData = data as ApiErrorResponse;
        throw {
          code: errData.error?.code || "AI_PROCESSING_FAILED",
          message: errData.error?.message || "Failed to remove background from image.",
          details: errData.error?.details,
        };
      }

      const successData = data as BackgroundRemovalResponse;
      setJobId(successData.jobId);
      setDetectedObject(successData.detectedObject);
      if (successData.hdUrl) {
        setHdUrl(successData.hdUrl);
      }
      setUploadProgress(90);

      // 3. Poll/Preload genuine Cloudinary background-removed URL to ensure transparent PNG is ready
      await pollForProcessedImage(successData.processedUrl);

      setProcessedUrl(successData.processedUrl);
      setUploadProgress(100);

      // 4. Update credits in real-time across Navbar, Dashboard, and Settings
      if (typeof successData.creditsRemaining === "number") {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("cleanpix_credits_updated", {
              detail: { credits: successData.creditsRemaining },
            })
          );
        }
        if (typeof updateSession === "function") {
          updateSession({ credits: successData.creditsRemaining }).catch((err) =>
            console.error("[USE_UPLOAD_SESSION_UPDATE_ERROR]", err)
          );
        }
      }

      // 5. Save to client history & database, and notify real-time listeners
      const newCutout = {
        id: successData.jobId || `proj-${Date.now()}`,
        originalName: file.name,
        originalUrl: successData.originalUrl || successData.processedUrl,
        cutoutUrl: successData.processedUrl,
        processedUrl: successData.processedUrl,
        timestamp: "Just now",
        createdAt: new Date().toISOString(),
        category: successData.detectedObject ? successData.detectedObject.charAt(0).toUpperCase() + successData.detectedObject.slice(1) : "Cutout",
        detectedObject: successData.detectedObject || "other",
      };

      try {
        const stored = localStorage.getItem("cleanpix_cutout_history");
        const list = stored ? JSON.parse(stored) : [];
        const updated = [newCutout, ...list.slice(0, 49)];
        localStorage.setItem("cleanpix_cutout_history", JSON.stringify(updated));
      } catch {}

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("cleanpix_project_created", { detail: newCutout })
        );
      }

      // Persist to database in background
      fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalUrl: successData.originalUrl || file.name,
          processedUrl: successData.processedUrl,
          detectedObject: successData.detectedObject || "other",
        }),
      }).catch(() => {});
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
        details: err.details || "Please verify your Cloudinary credentials or try again.",
      });
    } finally {
      setIsUploading(false);
      setIsProcessingAI(false);
    }
  }, [file, isProcessingAI, clearError]);

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

    // Derive HD URL if not already set
    let targetHdUrl = hdUrl;
    if (!targetHdUrl && processedUrl) {
      if (processedUrl.includes("e_background_removal")) {
        targetHdUrl = processedUrl.replace(
          "e_background_removal",
          "e_background_removal/dpr_2.0,e_sharpen,q_auto:best"
        );
      } else {
        targetHdUrl = processedUrl;
      }
      setHdUrl(targetHdUrl);
    }

    try {
      if (!targetHdUrl) throw new Error("HD transformation URL could not be generated.");

      // Poll and ensure Cloudinary has completed HD sharpening & 2x DPR transformation
      await pollForProcessedImage(targetHdUrl, 30, 1000);

      setIsHdReady(true);
      showToast("HD version generated.", "hd");
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

      showToast("Image copied to clipboard successfully.", "success");
    } catch (err: any) {
      console.error("[CLIPBOARD_COPY_ERROR]", err);
      const msg = err.message || "Could not copy image to clipboard.";
      showToast(msg, "error");
      throw err;
    }
  }, [isHdReady, hdUrl, processedUrl, showToast]);

  /**
   * Dual Quality Download Handler (Standard vs HD)
   */
  const downloadCutout = useCallback(
    async (quality: "standard" | "hd" = "standard") => {
      const isHd = quality === "hd";
      const targetUrl = isHd && isHdReady && hdUrl ? hdUrl : processedUrl;
      if (!targetUrl) return;

      const baseName = file ? file.name.replace(/\.[^/.]+$/, "") : "cleanpix";
      const defaultName = `${baseName}_cleanpix_${isHd ? "hd_enhanced" : "standard"}.png`;

      showToast("Download started.", "success");

      try {
        const response = await fetch(targetUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = defaultName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
      } catch {
        const link = document.createElement("a");
        link.href = targetUrl;
        link.target = "_blank";
        link.download = defaultName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },
    [file, isHdReady, hdUrl, processedUrl, showToast]
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
  };
}
