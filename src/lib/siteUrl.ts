/**
 * CleanPix - Safe Site URL & MetadataBase Resolver
 * 
 * Guarantees that URL constructions NEVER throw:
 *   TypeError: Invalid URL (input: '' or undefined)
 * 
 * Works seamlessly across:
 * - Vercel Production & Preview deployments (VERCEL_URL)
 * - Custom domain deployments (NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_APP_URL / SITE_URL)
 * - NextAuth configurations (NEXTAUTH_URL)
 * - Local development (localhost:3000)
 * - Headless / CI build environments without any env vars
 */

/**
 * Returns a sanitized absolute site URL origin string (e.g. "https://cleanpix.app").
 * Guaranteed to never return an empty string or malformed URL.
 */
export function getSiteUrl(): string {
  const candidates: Array<string | undefined> = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.SITE_URL,
    process.env.APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (
        trimmed !== "" &&
        trimmed !== "undefined" &&
        trimmed !== "null" &&
        trimmed !== '""' &&
        trimmed !== "''"
      ) {
        // Ensure standard http:// or https:// protocol
        const withProtocol =
          trimmed.startsWith("http://") || trimmed.startsWith("https://")
            ? trimmed
            : `https://${trimmed}`;

        try {
          const parsed = new URL(withProtocol);
          // Return clean origin without trailing slashes
          return parsed.origin;
        } catch {
          // If candidate is malformed, skip to next candidate
        }
      }
    }
  }

  // Safe fallback default
  return "https://cleanpix.app";
}

/**
 * Returns a guaranteed valid URL instance for Next.js metadataBase.
 * Never allows `new URL("")` or `new URL(undefined)`.
 */
export function getMetadataBase(): URL {
  try {
    const siteUrl = getSiteUrl();
    return new URL(siteUrl);
  } catch {
    return new URL("https://cleanpix.app");
  }
}
