import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "StorageViewr – fysisk lagerkontroll med mobilen";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const font = await readFile(join(process.cwd(), "assets/fonts/Roboto-Bold.ttf"));
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%",
      padding: "66px 76px", background: "linear-gradient(125deg, #09080e 35%, #241637)",
      color: "#f4f0fa", fontFamily: "Roboto", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 36 }}>
        <svg width="46" height="50" viewBox="0 0 24 26" fill="none">
          <path d="M12 1 23 7 12 13 1 7 12 1Z" fill="#ad82fa" />
          <path d="M1 8 11.5 13.7V25L1 19V8Z" fill="#9254db" />
          <path d="m12.5 13.7 10.5-5.7v11l-10.5 6V13.7Z" fill="#c6a4f5" />
        </svg>
        StorageViewr
      </div>
      <div style={{ display: "flex", maxWidth: 980, fontSize: 76, lineHeight: 1.08, letterSpacing: -2 }}>
        Se direkt hur lagret faktiskt mår.
      </div>
      <div style={{ display: "flex", fontSize: 27, color: "#c8badc" }}>
        Lagerplatser · Mobil inventering · Fysisk verifiering
      </div>
    </div>,
    { ...size, fonts: [{ name: "Roboto", data: font, style: "normal", weight: 700 }] },
  );
}
