import type { MetadataRoute } from "next";
import { publicIndexingEnabled, publicOrigin } from "@/lib/public-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!publicIndexingEnabled()) return [];
  return ["/", "/pilot", "/integritet", "/om-oss", "/kontakt"].map((path) => ({
    url: new URL(path, publicOrigin()).toString(),
  }));
}
