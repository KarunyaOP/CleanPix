import { v2 as cloudinary } from "cloudinary";

/**
 * Helper to strip surrounding quotes (single/double), trailing whitespace/newlines,
 * and inline comments from environment variables
 */
const cleanEnvVar = (val?: string): string => {
  if (!val) return "";
  let trimmed = val.replace(/[\r\n]+/g, "").trim();
  // Strip unquoted inline comments
  if (!trimmed.startsWith('"') && !trimmed.startsWith("'") && trimmed.includes("#")) {
    trimmed = trimmed.split("#")[0].trim();
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith("`") && trimmed.endsWith("`"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

/**
 * Configure and return Cloudinary client using server-side environment variables
 */
export const getCloudinaryClient = () => {
  const url = cleanEnvVar(process.env.CLOUDINARY_URL);
  const cloudName = cleanEnvVar(process.env.CLOUDINARY_CLOUD_NAME);
  const apiKey = cleanEnvVar(process.env.CLOUDINARY_API_KEY);
  const apiSecret = cleanEnvVar(process.env.CLOUDINARY_API_SECRET);

  if (url) {
    cloudinary.config({
      cloudinary_url: url,
      secure: true,
    });
  } else if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }
  return cloudinary;
};

/**
 * Check if valid Cloudinary credentials are provided in .env.local
 */
export const isCloudinaryConfigured = (): boolean => {
  const url = cleanEnvVar(process.env.CLOUDINARY_URL);
  const cloudName = cleanEnvVar(process.env.CLOUDINARY_CLOUD_NAME);
  const apiKey = cleanEnvVar(process.env.CLOUDINARY_API_KEY);
  const apiSecret = cleanEnvVar(process.env.CLOUDINARY_API_SECRET);

  const hasValidUrl = Boolean(
    url &&
      url.startsWith("cloudinary://") &&
      !url.includes("<your_api_key>") &&
      !url.includes("your_api_key")
  );

  const hasValidKeys = Boolean(
    cloudName &&
      apiKey &&
      apiSecret &&
      !cloudName.includes("your_cloud_name") &&
      !apiKey.includes("your_api_key") &&
      !apiSecret.includes("your_api_secret")
  );

  return hasValidUrl || hasValidKeys;
};

export { cloudinary };
