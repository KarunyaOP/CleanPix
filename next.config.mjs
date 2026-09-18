/** @type {import('next').NextConfig} */

// Determine safe site URL origin fallback
const resolveSiteUrl = () => {
  const candidates = [
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
        const withProtocol =
          trimmed.startsWith("http://") || trimmed.startsWith("https://")
            ? trimmed
            : `https://${trimmed}`;
        try {
          const parsed = new URL(withProtocol);
          return parsed.origin;
        } catch {
          // continue
        }
      }
    }
  }
  return "https://cleanpix.app";
};

const safeSiteUrl = resolveSiteUrl();

// Always ensure NEXTAUTH_URL is a valid non-empty URL string to prevent NextAuth prerender crashes
if (
  !process.env.NEXTAUTH_URL ||
  process.env.NEXTAUTH_URL.trim() === "" ||
  process.env.NEXTAUTH_URL === '""' ||
  process.env.NEXTAUTH_URL === "''"
) {
  process.env.NEXTAUTH_URL = safeSiteUrl;
}

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
