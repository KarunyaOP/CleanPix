import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  const routes = [
    "",
    "/login",
    "/pricing",
    "/history",
    "/dashboard",
    "/offline",
  ];

  const currentDate = new Date();

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: currentDate,
    changeFrequency: route === "" ? ("daily" as const) : ("weekly" as const),
    priority: route === "" ? 1.0 : route === "/pricing" ? 0.8 : 0.6,
  }));
}
