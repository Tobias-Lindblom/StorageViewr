import type { Metadata, Viewport } from "next";
import { AppViewport } from "@/components/app-viewport";
import { ScrollbarActivity } from "@/components/scrollbar-activity";
import { PwaRegistration } from "@/components/pwa-registration";
import { workspaceFont } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "StorageViewr – ditt lager under kontroll",
  applicationName: "StorageViewr",
  description:
    "Ett enklare lager- och inventeringssystem för mindre företag. Produkter, lagerplatser och antal – med mobilen i fokus.",
  manifest: "/manifest.webmanifest",
  formatDetection: {
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "StorageViewr",
  },
  icons: {
    icon: [
      { url: "/icons/icon-32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png?v=2",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#08070d",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sv">
      <body className={workspaceFont.variable}>
        <AppViewport />
        <ScrollbarActivity />
        <PwaRegistration />
        {children}
      </body>
    </html>
  );
}
