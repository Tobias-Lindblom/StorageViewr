import "server-only";
import PDFDocument from "pdfkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { LocationStockReport } from "./report-data";

const colors = {
  ink: "#201B2E",
  muted: "#6B6478",
  purple: "#6634BB",
  pale: "#F5F1FC",
  soft: "#FBFAFD",
  line: "#E2DCEB",
  green: "#167448",
  greenPale: "#EDF8F2",
};
const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const amount = (value: number | string) =>
  BigInt(value).toLocaleString("sv-SE");
const quantityLabel = (value: number, singular: string, plural: string) =>
  amount(value) + " " + (value === 1 ? singular : plural);
const date = (value: Date) =>
  value.toLocaleString("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export function locationStockReportFilename(report: LocationStockReport) {
  const scope =
    report.scopeName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "alla-lager";
  return "lagerplatsrapport-" + scope.toLowerCase() + ".pdf";
}

export async function renderLocationStockReport(
  report: LocationStockReport,
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
      Title: "Lagerplatsrapport – " + clean(report.scopeName),
      Author: "StorageViewr",
      Subject: "Aktuella produktplaceringar och lagersaldon",
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
      const left = 42;
      const width = 511.28;
      const bottom = 778;
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
      function header(firstPage = false) {
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
        if (firstPage) {
          text(report.scopeName, left, 73, width, 24, true);
          const selectedWarehouse =
            report.scopeName !== "Alla lager" && report.warehouses.length === 1
              ? report.warehouses[0]
              : null;
          text(
            report.companyName +
              (selectedWarehouse ? " · " + selectedWarehouse.code : "") +
              " · Exporterad " +
              date(exportedAt),
            left,
            105,
            width,
            8.5,
            false,
            colors.muted,
          );
          line(129);
          y = 146;
        } else {
          line(72);
          y = 94;
        }
      }
      function newPage() {
        doc.addPage();
        header();
      }
      function ensure(height: number) {
        if (y + height > bottom) newPage();
      }
      function metricCards(items: [string, string][]) {
        ensure(62);
        const gap = 10;
        const cardWidth = (width - gap * (items.length - 1)) / items.length;
        items.forEach(([label, value], index) => {
          const x = left + index * (cardWidth + gap);
          doc
            .roundedRect(x, y, cardWidth, 52, 7)
            .fillAndStroke(colors.pale, colors.line);
          text(label, x + 12, y + 8, cardWidth - 24, 7.5, false, colors.muted);
          text(value, x + 12, y + 23, cardWidth - 24, 15, true);
        });
        y += 62;
      }
      function tableHeader() {
        doc.rect(left, y, width, 22).fill(colors.pale);
        text("Lagerplats", left + 8, y + 6, 90, 7.5, true, colors.purple);
        text("Produkt", left + 106, y + 6, 216, 7.5, true, colors.purple);
        text("Artikelnummer", left + 330, y + 6, 100, 7.5, true, colors.purple);
        text("Antal", left + 438, y + 6, 65, 7.5, true, colors.purple, "right");
        y += 22;
      }
      function warehouseHeader(
        warehouse: LocationStockReport["warehouses"][number],
        continued = false,
      ) {
        if (!continued) {
          line(y);
          y += 11;
        }
        const suffix = continued ? " · fortsättning" : "";
        y += text(warehouse.name + suffix, left, y, width, 12, true) + 3;
        if (!continued) {
          const details =
            warehouse.code +
            (warehouse.address ? " · " + warehouse.address : "") +
            (warehouse.active ? "" : " · Inaktivt lager");
          y +=
            text(
              details,
              left,
              y,
              width,
              7.5,
              false,
              colors.muted,
            ) + 7;
        } else y += 3;
        tableHeader();
      }

      doc.addPage();
      header(true);
      metricCards([
        ["Lagerplatser", amount(report.summary.locations)],
        ["Unika produkter", amount(report.summary.uniqueProducts)],
        ["Produktplaceringar", amount(report.summary.placements)],
      ]);
      y +=
        text(
          "Omfattning: " +
            quantityLabel(report.summary.warehouses, "lager", "lager") +
            "  –  " +
            quantityLabel(report.summary.placements, "produktplacering", "produktplaceringar") +
            "  –  " +
            quantityLabel(report.summary.emptyLocations, "tom lagerplats", "tomma lagerplatser"),
          left,
          y,
          width,
          8.5,
          false,
          colors.muted,
        ) + 16;

      if (!report.warehouses.length) {
        doc.roundedRect(left, y, width, 44, 7).fillAndStroke(colors.soft, colors.line);
        text(
          "Det finns inga lagerplatser att visa i det valda urvalet.",
          left + 14,
          y + 15,
          width - 28,
          9,
          false,
          colors.muted,
        );
        y += 56;
      }

      const selectedWarehouseReport =
        report.scopeName !== "Alla lager" && report.warehouses.length === 1;
      for (const warehouse of report.warehouses) {
        ensure(selectedWarehouseReport ? 46 : 70);
        if (selectedWarehouseReport) tableHeader();
        else warehouseHeader(warehouse);
        let rowIndex = 0;
        for (const location of warehouse.locations) {
          const rows = location.rows.length ? location.rows : [null];
          for (const row of rows) {
            const locationLabel =
              location.code + (location.active ? "" : " · Inaktiv");
            const productLabel = row
              ? row.name + (row.active ? "" : " · Inaktiv produkt")
              : "Tom lagerplats";
            const height =
              Math.max(
                24,
                measure(locationLabel, 90, 8.5, true) + 12,
                measure(productLabel, 216, 8.5, Boolean(row)) + 12,
                row ? measure(row.sku, 100, 8.5, true) + 12 : 24,
              );
            if (y + height > bottom) {
              newPage();
              if (selectedWarehouseReport) tableHeader();
              else warehouseHeader(warehouse, true);
            }
            if (rowIndex % 2 === 1)
              doc.rect(left, y, width, height).fill(colors.soft);
            text(
              locationLabel,
              left + 8,
              y + 7,
              90,
              8.5,
              true,
              location.active ? colors.ink : colors.muted,
            );
            text(
              productLabel,
              left + 106,
              y + 7,
              216,
              8.5,
              Boolean(row),
              row ? colors.ink : colors.green,
            );
            if (row)
              text(
                row.sku,
                left + 330,
                y + 7,
                100,
                8.5,
                true,
                colors.ink,
              );
            text(
              row ? amount(row.quantity) + " st" : "–",
              left + 438,
              y + 7,
              65,
              8.5,
              Boolean(row),
              row ? colors.ink : colors.muted,
              "right",
            );
            y += height;
            line(y);
            rowIndex += 1;
          }
        }
        y += 14;
      }

      const range = doc.bufferedPageRange();
      for (let page = range.start; page < range.start + range.count; page++) {
        doc.switchToPage(page);
        const originalBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        line(793);
        text(
          "StorageViewr · Lagerplatsrapport",
          left,
          803,
          310,
          7,
          false,
          colors.muted,
        );
        text(
          "Exporterad " + date(exportedAt),
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
