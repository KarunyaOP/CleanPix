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
export function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error("Failed to load cutout image for canvas rendering."));
    // Add cache buster if external
    img.src = url.startsWith("blob:") ? url : `${url}${url.includes("?") ? "&" : "?"}_ts=${Date.now()}`;
  });
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

  const val = preset.value;

  if (val.startsWith("radial-gradient")) {
    const grad = ctx.createRadialGradient(
      width / 2,
      height * 0.35,
      10,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.75
    );
    if (preset.id.includes("white") || preset.id.includes("clean")) {
      grad.addColorStop(0, "#FFFFFF");
      grad.addColorStop(0.7, "#F1F5F9");
      grad.addColorStop(1, "#E2E8F0");
    } else if (preset.id.includes("pastel")) {
      grad.addColorStop(0, "#FFFFFF");
      grad.addColorStop(0.6, "#F3E8FF");
      grad.addColorStop(1, "#E9D5FF");
    } else if (preset.id.includes("gourmet")) {
      grad.addColorStop(0, "#2D1B00");
      grad.addColorStop(0.6, "#1A0F00");
      grad.addColorStop(1, "#080400");
    } else if (preset.id.includes("studio") || preset.id.includes("marble")) {
      grad.addColorStop(0, "#FFFFFF");
      grad.addColorStop(0.6, "#E2E8F0");
      grad.addColorStop(1, "#CBD5E1");
    } else {
      grad.addColorStop(0, "#334155");
      grad.addColorStop(1, "#090D16");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Linear Gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    if (preset.id.includes("linkedin")) {
      grad.addColorStop(0, "#002244");
      grad.addColorStop(0.5, "#004182");
      grad.addColorStop(1, "#0A66C2");
    } else if (preset.id.includes("office") || preset.id.includes("desk")) {
      grad.addColorStop(0, "#0F172A");
      grad.addColorStop(0.5, "#1E293B");
      grad.addColorStop(1, "#334155");
    } else if (preset.id.includes("outdoor")) {
      grad.addColorStop(0, "#2D1B00");
      grad.addColorStop(0.5, "#78350F");
      grad.addColorStop(1, "#D97706");
    } else if (preset.id.includes("synthwave")) {
      grad.addColorStop(0, "#1E1B4B");
      grad.addColorStop(0.5, "#581C87");
      grad.addColorStop(1, "#BE185D");
    } else if (preset.id.includes("fresh") || preset.id.includes("nature")) {
      grad.addColorStop(0, "#022C22");
      grad.addColorStop(0.5, "#065F46");
      grad.addColorStop(1, "#10B981");
    } else if (preset.id.includes("park")) {
      grad.addColorStop(0, "#14532D");
      grad.addColorStop(0.5, "#4D7C0F");
      grad.addColorStop(1, "#84CC16");
    } else if (preset.id.includes("road") || preset.id.includes("dark") || preset.id.includes("obsidian")) {
      grad.addColorStop(0, "#020617");
      grad.addColorStop(0.5, "#0F172A");
      grad.addColorStop(1, "#1E293B");
    } else if (preset.id.includes("gradient") || preset.id.includes("neon") || preset.id.includes("indigo")) {
      grad.addColorStop(0, "#090B1E");
      grad.addColorStop(0.5, "#1E1B4B");
      grad.addColorStop(1, "#4F46E5");
    } else {
      grad.addColorStop(0, "#0A0B1E");
      grad.addColorStop(1, "#131A3A");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }
}

/**
 * Render Cutout with Auto-Center and Smart Proportional Padding
 */
export async function renderSocialFormatCanvas(
  img: HTMLImageElement,
  format: SocialKitFormat,
  preset?: SmartBackgroundPreset | null,
  paddingPercent: number = 8
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = format.width;
  canvas.height = format.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create 2D canvas context.");

  // 1. Draw Background
  drawBackgroundOnCanvas(ctx, format.width, format.height, preset);

  // 2. Compute Smart Centering & Padding
  const padRatio = Math.max(0, Math.min(0.3, paddingPercent / 100));
  const maxAvailableW = format.width * (1 - padRatio * 2);
  const maxAvailableH = format.height * (1 - padRatio * 2);

  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;

  const scale = Math.min(maxAvailableW / imgW, maxAvailableH / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;

  const drawX = (format.width - drawW) / 2;
  const drawY = (format.height - drawH) / 2;

  // 3. Draw subject centered with high quality
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
