import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { getMetadataBase, getSiteUrl } from "@/lib/siteUrl";

export const viewport: Viewport = {
  themeColor: "#0A0B1E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "CleanPix — AI-Powered Background Remover in Seconds",
    template: "%s | CleanPix",
  },
  description:
    "Instantly remove backgrounds from images with AI precision. Smart background suggestions, auto-centering, and one-click social media exports.",
  manifest: "/manifest.json",
  applicationName: "CleanPix",
  authors: [{ name: "CleanPix", url: siteUrl }],
  creator: "CleanPix",
  publisher: "CleanPix",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "CleanPix",
    title: "CleanPix — AI-Powered Background Remover in Seconds",
    description:
      "Instantly remove backgrounds from images with AI precision. Smart background suggestions, auto-centering, and one-click social media exports.",
    images: [
      {
        url: "/branding/favicon/favicon-512x512.png",
        width: 512,
        height: 512,
        alt: "CleanPix AI Background Remover",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "CleanPix — AI-Powered Background Remover in Seconds",
    description:
      "Instantly remove backgrounds from images with AI precision. Smart background suggestions, auto-centering, and one-click social media exports.",
    images: ["/branding/favicon/favicon-512x512.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CleanPix",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/branding/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/branding/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/branding/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/branding/favicon/favicon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/branding/favicon/favicon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/branding/favicon/apple-touch-icon.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-[#0A0B1E] text-[#F8FAFC] antialiased min-h-screen relative overflow-x-hidden font-sans selection:bg-primary/40 selection:text-white">
        {/* Subtle Ambient Background Mesh */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          {/* Top-Left Blue Ambient Light */}
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[#4F7CFF]/10 blur-[140px]" />
          
          {/* Top-Right Purple Ambient Light */}
          <div className="absolute top-[10%] -right-40 w-[600px] h-[600px] rounded-full bg-[#8B5CF6]/8 blur-[150px]" />
          
          {/* Bottom Ambient Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#05060F_90%)] opacity-70" />
        </div>

        {/* PWA Lifecycle & Connectivity Handler */}
        <PwaRegister />

        {/* Main Content Tree with NextAuth Session Provider */}
        <AuthProvider>
          <div className="relative flex flex-col min-h-screen">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
