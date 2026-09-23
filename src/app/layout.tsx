import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StorageViewr – ditt lager under kontroll",
  description:
    "Ett enklare lager- och inventeringssystem för mindre företag. Produkter, lagerplatser och antal – med mobilen i fokus.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#090810",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
