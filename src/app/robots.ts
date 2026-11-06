import type { MetadataRoute } from "next";
import { publicIndexingEnabled, publicOrigin } from "@/lib/public-metadata";

export default function robots(): MetadataRoute.Robots {
  if (!publicIndexingEnabled()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
      allow: ["/$", "/pilot$", "/integritet$", "/om-oss$", "/kontakt$", "/_next/", "/images/", "/icons/", "/opengraph-image", "/sitemap.xml"],
    },
    sitemap: new URL("/sitemap.xml", publicOrigin()).toString(),
  };
}
