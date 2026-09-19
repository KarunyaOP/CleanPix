import JSZip from "jszip";
import { SocialKitFormat, SmartBackgroundPreset } from "@/types/schema";

export const SOCIAL_MEDIA_FORMATS: SocialKitFormat[] = [
  {
    id: "instagram-post",
    name: "Instagram Post",
    platform: "Instagram",
    aspectRatio: "1:1",
    width: 1080,
    height: 1080,
    description: "Square feed post (1080 × 1080 px)",
    iconName: "Instagram",
  },
  {
    id: "instagram-story",
    name: "Instagram Story / Reel",
    platform: "Instagram",
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    description: "Vertical full-screen story & reel (1080 × 1920 px)",
    iconName: "Smartphone",
  },
  {
    id: "youtube-thumbnail",
    name: "YouTube Thumbnail",
    platform: "YouTube",
    aspectRatio: "16:9",
    width: 1280,
    height: 720,
    description: "Widescreen video thumbnail (1280 × 720 px)",
    iconName: "Youtube",
  },
  {
    id: "linkedin-profile",
    name: "LinkedIn Profile / Post",
    platform: "LinkedIn",
    aspectRatio: "1:1",
    width: 800,
    height: 800,
    description: "Professional avatar & post (800 × 800 px)",
    iconName: "Linkedin",
  },
];

/**
 * Load image element with crossOrigin anonymous for canvas rendering
 */
export async function loadImageElement(url: string): Promise<HTMLImageElement> {
  // If it's already a blob or data URL, load directly
  if (url.startsWith("blob:") || url.startsWith("data:")) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load cutout image."));
      img.src = url;
    });
  }

  // Fetch as blob first to ensure cross-origin canvas is never tainted
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to decode image blob."));
      };
      img.src = objectUrl;
    });
  } catch {
    // Fallback to standard Image loading with crossOrigin
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load cutout image for canvas rendering."));
      img.src = `${url}${url.includes("?") ? "&" : "?"}_ts=${Date.now()}`;
    });
  }
}

/**
 * Draw background on Canvas 2D Context based on preset
 */
export function drawBackgroundOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  preset?: SmartBackgroundPreset | null
) {
  if (!preset || preset.id === "transparent" || preset.value === "transparent") {
    // Keep alpha transparent
    ctx.clearRect(0, 0, width, height);
    return;
  }

  const presetId = (preset.id || "").toLowerCase();
  const presetName = (preset.name || "").toLowerCase();
  const val = preset.value || "";

  // 1. Studio / High-Key Radial Lighting
  if (
    presetId.includes("studio") ||
    presetName.includes("studio") ||
    presetId.includes("white") ||
    val.startsWith("radial-gradient")
  ) {
    const grad = ctx.createRadialGradient(
      width / 2,
      height * 0.35,
      10,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.75
    );
    if (presetId.includes("dark") || presetId.includes("obsidian")) {
      grad.addColorStop(0, "#334155");
      grad.addColorStop(1, "#090D16");
    } else {
      grad.addColorStop(0, "#FFFFFF");
      grad.addColorStop(0.6, "#E2E8F0");
      grad.addColorStop(1, "#CBD5E1");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  // 2. Linear Gradients (Office, Outdoor, LinkedIn, etc.)
  const grad = ctx.createLinearGradient(0, 0, width, height);

  if (presetId.includes("linkedin") || presetName.includes("linkedin")) {
    grad.addColorStop(0, "#002244");
    grad.addColorStop(0.5, "#004182");
    grad.addColorStop(1, "#0A66C2");
  } else if (presetId.includes("office") || presetName.includes("office") || presetId.includes("desk")) {
    grad.addColorStop(0, "#0F172A");
    grad.addColorStop(0.5, "#1E293B");
    grad.addColorStop(1, "#334155");
  } else if (presetId.includes("outdoor") || presetName.includes("outdoor")) {
    grad.addColorStop(0, "#2D1B00");
    grad.addColorStop(0.5, "#78350F");
    grad.addColorStop(1, "#D97706");
  } else if (presetId.includes("nature") || presetId.includes("fresh") || presetName.includes("nature")) {
    grad.addColorStop(0, "#022C22");
    grad.addColorStop(0.5, "#065F46");
    grad.addColorStop(1, "#10B981");
  } else if (presetId.includes("synthwave") || presetName.includes("synthwave")) {
    grad.addColorStop(0, "#1E1B4B");
    grad.addColorStop(0.5, "#581C87");
    grad.addColorStop(1, "#BE185D");
  } else if (presetId.includes("ecommerce") || presetId.includes("road")) {
    grad.addColorStop(0, "#020617");
    grad.addColorStop(0.5, "#0F172A");
    grad.addColorStop(1, "#1E293B");
  } else {
    // Default CleanPix Modern Gradient
    grad.addColorStop(0, "#090B1E");
    grad.addColorStop(0.5, "#1E1B4B");
    grad.addColorStop(1, "#4F46E5");
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Render Cutout with Auto-Center and Smart Proportional Padding
 */
export async function renderSocialFormatCanvas(
  img: HTMLImageElement,
  format: SocialKitFormat,
  preset?: SmartBackgroundPreset | null,
  paddingPercent: number = 0
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = format.width;
  canvas.height = format.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create 2D canvas context.");

  // 1. Draw Background
  drawBackgroundOnCanvas(ctx, format.width, format.height, preset);

  // 2. Compute Smart Centering & Padding
  // Fit (0%): Natural scale (no zoom/crop), horizontally centered, aligned flush to bottom edge
  // Balanced (50%): padRatio = 0.12 (moderate 12% space, centered)
  // Spacious (100%): padRatio = 0.24 (spacious 24% space, centered)
  const imgW = img.naturalWidth || img.width || 800;
  const imgH = img.naturalHeight || img.height || 800;

  let drawW: number;
  let drawH: number;
  let drawX: number;
  let drawY: number;

  if (paddingPercent === 0) {
    const scale = Math.min(format.width / imgW, format.height / imgH);
    drawW = imgW * scale;
    drawH = imgH * scale;
    drawX = (format.width - drawW) / 2;
    drawY = format.height - drawH; // Flush with bottom edge, zero bottom padding
  } else {
    const padRatio =
      paddingPercent === 50
        ? 0.12
        : paddingPercent === 100
        ? 0.24
        : Math.max(0.02, Math.min(0.35, (paddingPercent / 100) * 0.24));

    const maxAvailableW = format.width * (1 - padRatio * 2);
    const maxAvailableH = format.height * (1 - padRatio * 2);

    const scale = Math.min(maxAvailableW / imgW, maxAvailableH / imgH);
    drawW = imgW * scale;
    drawH = imgH * scale;

    drawX = (format.width - drawW) / 2;
    drawY = (format.height - drawH) / 2;
  }

  // 3. Draw subject with high quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  return canvas;
}

/**
 * Convert Canvas to Blob
 */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas blob conversion failed."));
    }, "image/png");
  });
}

/**
 * Download a single Social Media Kit Image
 */
export async function downloadSocialKitItem(
  imageUrl: string,
  format: SocialKitFormat,
  preset?: SmartBackgroundPreset | null,
  paddingPercent: number = 8,
  baseFilename: string = "cleanpix"
): Promise<void> {
  const img = await loadImageElement(imageUrl);
  const canvas = await renderSocialFormatCanvas(img, format, preset, paddingPercent);
  const blob = await canvasToBlob(canvas);
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `${baseFilename}_${format.id}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
}

/**
 * Bundle and download All 4 Social Media Kit Formats as a ZIP file
 */
export async function downloadSocialKitZip(
  imageUrl: string,
  preset?: SmartBackgroundPreset | null,
  paddingPercent: number = 8,
  baseFilename: string = "cleanpix"
): Promise<void> {
  const img = await loadImageElement(imageUrl);
  const zip = new JSZip();
  const folder = zip.folder("CleanPix_Social_Kit") || zip;

  for (const format of SOCIAL_MEDIA_FORMATS) {
    const canvas = await renderSocialFormatCanvas(img, format, preset, paddingPercent);
    const blob = await canvasToBlob(canvas);
    const arrayBuffer = await blob.arrayBuffer();
    folder.file(`${baseFilename}_${format.id}.png`, arrayBuffer);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const zipUrl = URL.createObjectURL(zipBlob);

  const link = document.createElement("a");
  link.href = zipUrl;
  link.download = `${baseFilename}_Social_Media_Kit.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(zipUrl), 2000);
}
