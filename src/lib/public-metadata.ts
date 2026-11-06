import type { Metadata } from "next";

export function publicOrigin() {
  return new URL(process.env.APP_URL || "http://localhost:3000").origin;
}

export function publicIndexingEnabled() {
  return process.env.NODE_ENV === "production" &&
    Boolean(process.env.APP_URL) &&
    (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production");
}

export function publicMetadata(path: string, title: string, description: string): Metadata {
  const url = new URL(path, publicOrigin()).toString();
  return {
    title, description,
    alternates: { canonical: url },
    robots: { index: publicIndexingEnabled(), follow: publicIndexingEnabled() },
    openGraph: {
      title, description, url, siteName: "StorageViewr", type: "website",
      locale: "sv_SE",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "StorageViewr – fysisk lagerkontroll med mobilen" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  };
}
