import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "StorageViewr – ditt lager under kontroll",
    short_name: "StorageViewr",
    description:
      "Hantera produkter, lagerplatser, saldon och inventeringar direkt i mobilen.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#08070d",
    theme_color: "#08070d",
    lang: "sv",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
