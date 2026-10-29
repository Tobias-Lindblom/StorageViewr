import "server-only";

import type { LocationLabel } from "./labels";
import {
  cleanPdfText as clean,
  createReportDocument,
  installReportFonts,
  loadReportFonts,
  renderPdfBuffer,
  reportColors as colors,
} from "@/lib/server/pdf-report";

function safeFilenamePart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .toLowerCase();
}

export function locationLabelsFilename(labels: LocationLabel[]) {
  const warehouses = [...new Set(labels.map((label) => label.warehouseName))];
  const scope = warehouses.length === 1
    ? safeFilenamePart(warehouses[0])
    : "alla-lager";
  return "qr-etiketter-" + (scope || "lagerplatser") + ".pdf";
}

function qrBuffer(dataUrl: string) {
  const marker = "data:image/png;base64,";
  if (!dataUrl.startsWith(marker)) throw new Error("Ogiltig QR-bild.");
  return Buffer.from(dataUrl.slice(marker.length), "base64");
}

export async function renderLocationLabelsPdf(
  labels: LocationLabel[],
  exportedAt = new Date(),
) {
  const fonts = await loadReportFonts();
  const doc = createReportDocument({
    title: "QR-etiketter för lagerplatser",
    subject: "Utskrivbara QR-etiketter för StorageViewr",
    exportedAt,
  });
  installReportFonts(doc, fonts);

  return renderPdfBuffer(doc, () => {
    const left = 42;
    const top = 42;
    const width = 511.28;
    const availableHeight = 733;
    const columnGap = 12;
    const rowGap = 12;
    const columns = 2;
    const rows = 3;
    const cardWidth = (width - columnGap) / columns;
    const cardHeight = (availableHeight - rowGap * (rows - 1)) / rows;
    const qrSize = 126;

    labels.forEach((label, index) => {
      const position = index % (columns * rows);
      if (position === 0) doc.addPage();

      const column = position % columns;
      const row = Math.floor(position / columns);
      const x = left + column * (cardWidth + columnGap);
      const y = top + row * (cardHeight + rowGap);

      doc
        .roundedRect(x, y, cardWidth, cardHeight, 7)
        .fillAndStroke(colors.soft, colors.line);

      doc
        .save()
        .translate(x + 14, y + 13)
        .scale(0.46)
        .path("M12 1 23 7 12 13 1 7 12 1Z")
        .fill("#AA88FF")
        .path("M1 8 11.5 13.7V25L1 19V8Z")
        .fill("#9254DB")
        .path("m12.5 13.7 10.5-5.7v11l-10.5 6V13.7Z")
        .fill("#C6A4F5")
        .restore();
      doc
        .font("bold")
        .fontSize(10)
        .fillColor(colors.ink)
        .text("StorageViewr", x + 30, y + 14, { width: cardWidth - 44 });

      const qrX = x + (cardWidth - qrSize) / 2;
      doc.image(qrBuffer(label.image), qrX, y + 34, {
        width: qrSize,
        height: qrSize,
      });

      doc
        .font("bold")
        .fontSize(17)
        .fillColor(colors.ink)
        .text(clean(label.code), x + 14, y + 166, {
          width: cardWidth - 28,
          align: "center",
        });
      doc
        .font("regular")
        .fontSize(8.5)
        .fillColor(colors.muted)
        .text(clean(label.warehouseName), x + 14, y + 190, {
          width: cardWidth - 28,
          align: "center",
        });
      doc
        .font("regular")
        .fontSize(7)
        .fillColor(colors.muted)
        .text("Skanna för att öppna lagerplatsen", x + 14, y + cardHeight - 19, {
          width: cardWidth - 28,
          align: "center",
        });

    });
  });
}
