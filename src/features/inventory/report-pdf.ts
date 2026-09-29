import "server-only";
import PDFDocument from "pdfkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { InventoryReport } from "./report-data";

const colors = {
  ink: "#201B2E",
  muted: "#6B6478",
  purple: "#6634BB",
  pale: "#F5F1FC",
  soft: "#FBFAFD",
  line: "#E2DCEB",
  green: "#167448",
  greenPale: "#EDF8F2",
  red: "#AD354E",
  redPale: "#FBEFF2",
};
const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const amount = (value: number | string) =>
  BigInt(value).toLocaleString("sv-SE");
const quantityLabel = (
  value: number,
  singular: string,
  plural: string,
) => amount(value) + " " + (value === 1 ? singular : plural);
const signed = (value: number | string) =>
  (BigInt(value) > BigInt(0) ? "+" : "") + amount(value);
const date = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("sv-SE", {
        timeZone: "Europe/Stockholm",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Ej sparat";

export function inventoryReportFilename(report: InventoryReport) {
  const name =
    report.name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "inventering";
  return (
    "inventering-" + name.toLowerCase() + "-" + report.id.slice(-6) + ".pdf"
  );
}

export async function renderInventoryReport(
  report: InventoryReport,
  exportedAt = new Date(),
) {
  const [regular, bold] = await Promise.all([
    readFile(path.join(process.cwd(), "assets/fonts/Roboto-Regular.ttf")),
    readFile(path.join(process.cwd(), "assets/fonts/Roboto-Bold.ttf")),
  ]);
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 42, left: 42, right: 42, bottom: 54 },
    bufferPages: true,
    autoFirstPage: false,
    info: {
      Title: "Inventeringsrapport – " + clean(report.name),
      Author: "StorageViewr",
      Subject: "Genomförd inventering: " + clean(report.warehouseName),
      Creator: "StorageViewr",
      CreationDate: exportedAt,
    },
  });
  doc.registerFont("regular", regular);
  doc.registerFont("bold", bold);
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      const left = 42,
        width = 511.28,
        bottom = 778;
      let y = 0;
      const measure = (value: string, w: number, size = 9, strong = false) =>
        doc
          .font(strong ? "bold" : "regular")
          .fontSize(size)
          .heightOfString(clean(value), { width: w, lineGap: 2 });
      function text(
        value: string,
        x: number,
        top: number,
        w: number,
        size = 9,
        strong = false,
        color = colors.ink,
        align: "left" | "right" = "left",
      ) {
        doc
          .font(strong ? "bold" : "regular")
          .fontSize(size)
          .fillColor(color)
          .text(clean(value), x, top, { width: w, lineGap: 2, align });
        return measure(value, w, size, strong);
      }
      function line(top: number) {
        doc
          .moveTo(left, top)
          .lineTo(left + width, top)
          .lineWidth(0.6)
          .strokeColor(colors.line)
          .stroke();
      }
      function header() {
        doc
          .save()
          .roundedRect(left, 30, 27, 27, 7)
          .fillAndStroke(colors.pale, "#D5C6EE");
        doc
          .translate(left + 4, 34)
          .scale(0.8)
          .path(
            "M12 3 L21 8 L21 16 L12 21 L3 16 L3 8 Z M12 12 L21 8 M12 12 L3 8 M12 12 L12 21",
          )
          .lineWidth(1.5)
          .strokeColor(colors.purple)
          .stroke()
          .restore();
        text("StorageViewr.", left + 36, 35, 175, 16, true);
        text(
          "Inventeringsrapport",
          left + width - 180,
          37,
          180,
          9,
          true,
          colors.purple,
          "right",
        );
        line(72);
        y = 94;
      }
      function newPage() {
        doc.addPage();
        header();
      }
      function ensure(height: number) {
        if (y + height > bottom) newPage();
      }
      function heading(title: string, subtitle?: string) {
        ensure(65);
        y += text(title, left, y, width, 16, true) + 6;
        if (subtitle)
          y += text(subtitle, left, y, width, 9, false, colors.muted) + 8;
      }
      function facts(items: [string, string][]) {
        const w = (width - 26) / 2;
        const heights: number[] = [];
        for (let i = 0; i < items.length; i += 2) {
          const row = items.slice(i, i + 2);
          heights.push(
            Math.max(...row.map(([, value]) => measure(value, w - 26, 10))) +
              31,
          );
        }
        const panelHeight = heights.reduce((sum, height) => sum + height, 0);
        ensure(panelHeight + 8);
        doc
          .roundedRect(left, y, width, panelHeight, 8)
          .fillAndStroke(colors.soft, colors.line);
        let rowY = y;
        for (let i = 0; i < items.length; i += 2) {
          const row = items.slice(i, i + 2);
          const height = heights[i / 2];
          if (i > 0) {
            doc
              .moveTo(left + 14, rowY)
              .lineTo(left + width - 14, rowY)
              .lineWidth(0.5)
              .strokeColor(colors.line)
              .stroke();
          }
          doc
            .moveTo(left + width / 2, rowY + 10)
            .lineTo(left + width / 2, rowY + height - 10)
            .lineWidth(0.5)
            .strokeColor(colors.line)
            .stroke();
          row.forEach(([label, value], index) => {
            const x = left + index * (w + 26) + 13;
            text(label, x, rowY + 10, w - 26, 7.5, false, colors.muted);
            text(value, x, rowY + 24, w - 26, 10, true);
          });
          rowY += height;
        }
        y += panelHeight + 12;
      }
      function metricCards(items: [string, string][]) {
        ensure(72);
        const gap = 10,
          w = (width - gap * (items.length - 1)) / items.length;
        items.forEach(([label, value], index) => {
          const x = left + index * (w + gap);
          doc
            .roundedRect(x, y, w, 62, 7)
            .fillAndStroke(colors.pale, colors.line);
          text(label, x + 12, y + 10, w - 24, 8, false, colors.muted);
          text(value, x + 12, y + 28, w - 24, 17, true, colors.ink);
        });
        y += 72;
      }
      function resultBanner() {
        const hasDiscrepancies = report.summary.discrepancies > 0;
        const background = hasDiscrepancies
          ? colors.redPale
          : colors.greenPale;
        const accent = hasDiscrepancies ? colors.red : colors.green;
        const title = hasDiscrepancies
          ? amount(report.summary.discrepancies) +
            (report.summary.discrepancies === 1
              ? " rad med avvikelse"
              : " rader med avvikelse")
          : "Inga avvikelser registrerade";
        const description = hasDiscrepancies
          ? "Nettodifferens " + signed(report.summary.difference) + " st"
          : "Räknat antal överensstämmer med förväntat antal.";
        ensure(58);
        doc
          .roundedRect(left, y, width, 48, 7)
          .fillAndStroke(background, accent);
        doc.roundedRect(left, y, 4, 48, 2).fill(accent);
        text(title, left + 16, y + 9, width - 32, 10, true, accent);
        text(description, left + 16, y + 27, width - 32, 8, false, accent);
        y += 60;
      }

      newPage();
      y += 17;
      y += text("GENOMFÖRD INVENTERING", left, y, width, 8, true, colors.purple) +
        7;
      y += text(report.name, left, y, width, 24, true) + 17;
      facts([
        ["Företag", report.companyName],
        ["Lager", report.warehouseName],
        ["Startad", date(report.startedAt)],
        ["Genomförd", date(report.completedAt)],
      ]);
      y += 5;
      heading("Sammanfattning");
      resultBanner();
      metricCards([
        ["Förväntat antal", amount(report.summary.expected) + " st"],
        ["Räknat antal", amount(report.summary.counted) + " st"],
        ["Nettodifferens", signed(report.summary.difference) + " st"],
      ]);
      y +=
        text(
          "Omfattning: " +
            quantityLabel(
              report.summary.places,
              "lagerplats",
              "lagerplatser",
            ) +
            "  –  " +
            quantityLabel(
              report.summary.products,
              "unik produkt",
              "unika produkter",
            ) +
            "  –  " +
            quantityLabel(report.summary.rows, "räknad rad", "räknade rader"),
          left,
          y,
          width,
          8.5,
          false,
          colors.muted,
        ) + 8;
      y +=
        text(
          "Fördelning: Överskott " +
            signed(report.summary.surplus) +
            " st   ·   Underskott " +
            signed(report.summary.shortage) +
            " st   ·   Tomma platser " +
            report.summary.emptyPlaces,
          left,
          y,
          width,
          8.5,
          false,
          colors.muted,
        ) + 10;
      if (report.currentCompanyName) {
        ensure(36);
        y +=
          text(
            "Företagsnamnet visas enligt uppgifterna vid export eftersom namn vid avslut saknas i det äldre underlaget.",
            left,
            y,
            width,
            8,
            false,
            colors.muted,
          ) + 8;
      }
      y += 12;
      ensure(220);
      heading(
        "Inventering per lagerplats",
        "Samtliga registrerade rader visas, även de utan avvikelse. Alla antal anges i styck.",
      );

      const colWidths = [244.28, 89, 89, 89];
      const colX = [
        left,
        left + colWidths[0],
        left + colWidths[0] + 89,
        left + colWidths[0] + 178,
      ];
      function tableHeader() {
        doc.rect(left, y, width, 26).fill(colors.pale);
        ["Produkt / artikelnummer", "Förväntat", "Räknat", "Avvikelse"].forEach(
          (label, index) =>
            text(
              label,
              colX[index] + 9,
              y + 8,
              colWidths[index] - 18,
              8,
              true,
              colors.purple,
              index ? "right" : "left",
            ),
        );
        y += 26;
      }
      function placeHeader(
        place: InventoryReport["places"][number],
        continued = false,
      ) {
        const title = place.code + (continued ? " · fortsättning" : "");
        doc.roundedRect(left, y + 1, 4, 17, 2).fill(colors.purple);
        y += text(title, left + 12, y, width - 12, 12, true) + 4;
        if (!continued) {
          y +=
            text(
              "Räknad av " + place.countedBy + " · " + date(place.countedAt),
              left + 12,
              y,
              width - 12,
              8,
              false,
              colors.muted,
            ) + 8;
        } else y += 5;
        if (place.rows.length) tableHeader();
      }
      for (const place of report.places) {
        const rowHeight = (
          row: InventoryReport["places"][number]["rows"][number],
        ) => {
          const nameHeight = measure(row.name, colWidths[0] - 18, 9.5, true);
          const skuHeight = measure(row.sku, colWidths[0] - 18, 8);
          const actorHeight = measure(
            row.countedBy + " · " + date(row.countedAt),
            colWidths[0] - 18,
            7.5,
          );
          return nameHeight + skuHeight + actorHeight + 24;
        };
        const introHeight =
          measure(place.code, width, 12, true) +
          measure(
            "Räknad av " + place.countedBy + " · " + date(place.countedAt),
            width,
            8,
          ) +
          12;
        ensure(
          introHeight +
            (place.rows.length ? 26 + rowHeight(place.rows[0]) : 42),
        );
        placeHeader(place);
        if (!place.rows.length) {
          doc.roundedRect(left, y, width, 32, 5).fill("#F3F7F4");
          text(
            "Bekräftad tom lagerplats · inga produktrader registrerade.",
            left + 12,
            y + 10,
            width - 24,
            9,
            false,
            colors.green,
          );
          y += 49;
          continue;
        }
        for (const row of place.rows) {
          const height = rowHeight(row);
          if (y + height > bottom) {
            newPage();
            placeHeader(place, true);
          }
          if (row.difference !== 0)
            doc.rect(left, y, width, height).fill("#FAF8FE");
          let detailY = y + 10;
          detailY +=
            text(row.name, left + 9, detailY, colWidths[0] - 18, 9.5, true) + 3;
          detailY +=
            text(
              row.sku,
              left + 9,
              detailY,
              colWidths[0] - 18,
              8,
              false,
              colors.muted,
            ) + 3;
          text(
            row.countedBy + " · " + date(row.countedAt),
            left + 9,
            detailY,
            colWidths[0] - 18,
            7.5,
            false,
            colors.muted,
          );
          [
            amount(row.expected),
            amount(row.counted),
            signed(row.difference),
          ].forEach((value, index) => {
            const color =
              index === 2 && row.difference !== 0
                ? row.difference < 0
                  ? colors.red
                  : colors.green
                : colors.ink;
            text(
              value,
              colX[index + 1] + 7,
              y + 11,
              colWidths[index + 1] - 14,
              8,
              index === 2,
              color,
              "right",
            );
          });
          y += height;
          line(y);
        }
        y += 16;
      }
      const range = doc.bufferedPageRange();
      for (let page = range.start; page < range.start + range.count; page++) {
        doc.switchToPage(page);
        const originalBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        line(793);
        text(
          "StorageViewr · Rapport-ID: " + report.id,
          left,
          803,
          310,
          7,
          false,
          colors.muted,
        );
        text(
          "Exporterad " + date(exportedAt.toISOString()),
          left,
          816,
          310,
          7,
          false,
          colors.muted,
        );
        text(
          "Sida " + (page + 1) + " av " + range.count,
          left + width - 105,
          809,
          105,
          8,
          false,
          colors.muted,
          "right",
        );
        doc.page.margins.bottom = originalBottom;
      }
      doc.end();
    } catch (error) {
      doc.destroy();
      reject(error);
    }
  });
}
