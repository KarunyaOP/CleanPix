import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CleanPix — AI Background Remover",
    short_name: "CleanPix",
    description: "Instantly remove backgrounds from images with AI precision. Smart background suggestions, auto-centering, and one-click social media exports.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0A0B1E",
    theme_color: "#0A0B1E",
    categories: ["photo", "productivity", "utilities"],
    icons: [
      {
        src: "/branding/favicon/favicon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/branding/favicon/favicon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/branding/favicon/favicon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/branding/favicon/favicon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "New Cutout",
        short_name: "Upload",
        description: "Upload an image and remove background",
        url: "/#top",
        icons: [{ src: "/branding/favicon/favicon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Processing History",
        short_name: "History",
        description: "View your past cutouts and downloads",
        url: "/history",
        icons: [{ src: "/branding/favicon/favicon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Workspace Dashboard",
        short_name: "Dashboard",
        description: "Manage your CleanPix workspace",
        url: "/dashboard",
        icons: [{ src: "/branding/favicon/favicon-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}
