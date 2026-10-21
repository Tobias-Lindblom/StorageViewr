import "server-only";
import PDFDocument from "pdfkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { InventoryReport } from "./report-data";
import { formatSek, formatUnitValue } from "@/lib/money";

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
const quantityLabel = (value: number, singular: string, plural: string) =>
  amount(value) + " " + (value === 1 ? singular : plural);
const signed = (value: number | string) =>
  (BigInt(value) > BigInt(0) ? "+" : "") + amount(value);
const formatSignedSek = (value: number | string | bigint) => {
  const units = BigInt(value);
  const absolute = units < BigInt(0) ? -units : units;
  return (
    (units > BigInt(0) ? "+" : units < BigInt(0) ? "−" : "") +
    formatSek(absolute)
  );
};
const date = (value: Date | string | null) =>
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
      const left = 42;
      const width = 511.28;
      const bottom = 733;
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
          text("Inventeringsrapport", left, 73, width, 24, true);
          text(
            report.companyName + " · Exporterad " + date(exportedAt),
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

      function heading(title: string, subtitle?: string) {
        ensure(subtitle ? 50 : 30);
        y += text(title, left, y, width, 15, true) + 5;
        if (subtitle)
          y += text(subtitle, left, y, width, 8, false, colors.muted) + 9;
      }

      function facts(items: [string, string][]) {
        const columnWidth = width / 2;
        const innerWidth = columnWidth - 26;
        const rowHeights: number[] = [];
        for (let index = 0; index < items.length; index += 2) {
          const row = items.slice(index, index + 2);
          rowHeights.push(
            Math.max(...row.map(([, value]) => measure(value, innerWidth, 9))) +
              31,
          );
        }
        const panelHeight = rowHeights.reduce(
          (total, height) => total + height,
          0,
        );
        ensure(panelHeight + 12);
        doc
          .roundedRect(left, y, width, panelHeight, 7)
          .fillAndStroke(colors.soft, colors.line);
        let rowY = y;
        for (let index = 0; index < items.length; index += 2) {
          const row = items.slice(index, index + 2);
          const height = rowHeights[index / 2];
          if (index > 0) {
            doc
              .moveTo(left + 13, rowY)
              .lineTo(left + width - 13, rowY)
              .lineWidth(0.5)
              .strokeColor(colors.line)
              .stroke();
          }
          doc
            .moveTo(left + columnWidth, rowY + 10)
            .lineTo(left + columnWidth, rowY + height - 10)
            .lineWidth(0.5)
            .strokeColor(colors.line)
            .stroke();
          row.forEach(([label, value], column) => {
            const x = left + column * columnWidth + 13;
            text(label, x, rowY + 9, innerWidth, 7.2, false, colors.muted);
            text(value, x, rowY + 23, innerWidth, 9, true);
          });
          rowY += height;
        }
        y += panelHeight + 12;
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
          let valueSize = 15;
          doc.font("bold");
          while (valueSize > 9) {
            doc.fontSize(valueSize);
            if (doc.widthOfString(value) <= cardWidth - 24) break;
            valueSize -= 0.5;
          }
          text(value, x + 12, y + 23, cardWidth - 24, valueSize, true);
        });
        y += 62;
      }

      function resultBanner() {
        const hasDiscrepancies = report.summary.discrepancies > 0;
        const background = hasDiscrepancies ? colors.redPale : colors.greenPale;
        const accent = hasDiscrepancies ? colors.red : colors.green;
        const title = hasDiscrepancies
          ? quantityLabel(
              report.summary.discrepancies,
              "rad med avvikelse",
              "rader med avvikelse",
            )
          : "Inga avvikelser registrerade";
        const description = hasDiscrepancies
          ? "Nettodifferens " + signed(report.summary.difference) + " st"
          : "Räknat antal överensstämmer med förväntat antal.";
        ensure(58);
        doc.roundedRect(left, y, width, 48, 7).fill(background);
        doc.roundedRect(left, y, 4, 48, 2).fill(accent);
        text(title, left + 16, y + 9, width - 32, 10, true, accent);
        text(description, left + 16, y + 27, width - 32, 8, false, accent);
        y += 60;
      }

      doc.addPage();
      header(true);
      y += text(report.name, left, y, width, 18, true) + 5;
      y +=
        text(
          "Slutförd inventering · " + report.warehouseName,
          left,
          y,
          width,
          8.5,
          false,
          colors.muted,
        ) + 12;
      facts([
        ["Startad", date(report.startedAt) + " · " + report.startedBy],
        ["Slutförd", date(report.completedAt) + " · " + report.completedBy],
      ]);

      resultBanner();
      metricCards([
        ["Förväntat antal", amount(report.summary.expected) + " st"],
        ["Räknat antal", amount(report.summary.counted) + " st"],
        [
          "Räknat värde",
          formatSek(BigInt(report.summary.countedValueUnits)),
        ],
        [
          "Värdedifferens",
          formatSignedSek(report.summary.valueDifferenceUnits),
        ],
      ]);
      y +=
        text(
          "Omfattning: " +
            quantityLabel(report.summary.places, "lagerplats", "lagerplatser") +
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
        ) + 5;
      y +=
        text(
          "Fördelning: Överskott " +
            signed(report.summary.surplus) +
            " st  –  Underskott " +
            signed(report.summary.shortage) +
            " st  –  " +
            quantityLabel(
              report.summary.emptyPlaces,
              "tom lagerplats",
              "tomma lagerplatser",
            ),
          left,
          y,
          width,
          8,
          false,
          colors.muted,
        ) + 5;
      y +=
        text(
          report.summary.productsWithoutValue === 0
            ? "Värdering: Räknat lagervärde " +
                formatSek(BigInt(report.summary.countedValueUnits)) +
                "  –  Värdedifferens " +
                formatSignedSek(report.summary.valueDifferenceUnits)
            : "Värdering: " +
                quantityLabel(
                  report.summary.productsWithoutValue,
                  "produkt saknar styckvärde",
                  "produkter saknar styckvärde",
                ) +
                " och ingår inte i värdekolumnernas total.",
          left,
          y,
          width,
          8,
          false,
          report.summary.productsWithoutValue > 0
            ? colors.purple
            : BigInt(report.summary.valueDifferenceUnits) < BigInt(0)
              ? colors.red
              : BigInt(report.summary.valueDifferenceUnits) > BigInt(0)
                ? colors.green
                : colors.muted,
        ) + 10;
      if (report.currentCompanyName) {
        ensure(36);
        doc.roundedRect(left, y, width, 30, 5).fill(colors.soft);
        text(
          "Företagsnamnet hämtades vid export eftersom uppgiften saknas i det äldre underlaget.",
          left + 11,
          y + 9,
          width - 22,
          7.5,
          false,
          colors.muted,
        );
        y += 40;
      }

      y += 9;
      ensure(118);
      heading(
        "Inventerade lagerplatser",
        "Alla registrerade produktrader visas, även de utan avvikelse. Antal anges i styck.",
      );

      const colWidths = [55, 86, 55, 52, 52, 62, 73, 76.28];
      const colX = colWidths.map((_, index) =>
        left +
        colWidths
          .slice(0, index)
          .reduce((total, columnWidth) => total + columnWidth, 0),
      );
      const headers = [
        "Lagerplats",
        "Produkt",
        "Art.nr",
        "Förväntat antal",
        "Räknat antal",
        "Styckvärde",
        "Totalt värde",
        "Värdedifferens",
      ];

      function fittedText(
        value: string,
        x: number,
        top: number,
        cellWidth: number,
        size: number,
        strong = false,
        color = colors.ink,
        align: "left" | "right" = "left",
      ) {
        let fittedSize = size;
        doc.font(strong ? "bold" : "regular");
        while (fittedSize > 4.2) {
          doc.fontSize(fittedSize);
          if (doc.widthOfString(clean(value)) <= cellWidth) break;
          fittedSize -= 0.2;
        }
        text(value, x, top, cellWidth, fittedSize, strong, color, align);
      }

      function tableHeader() {
        doc.rect(left, y, width, 25).fill(colors.pale);
        headers.forEach((label, index) => {
          const numeric = index >= 3;
          text(
            label,
            colX[index] + 5,
            y + 7,
            colWidths[index] - 10,
            5.4,
            true,
            colors.purple,
            numeric ? "right" : "left",
          );
        });
        y += 25;
      }

type ReportPlace = InventoryReport["places"][number];
type ReportRow = ReportPlace["rows"][number];

type TableRow = {
  place: ReportPlace;
  row: ReportRow | null;
};

const tableRows = report.places.flatMap<TableRow>((place) =>
  place.rows.length
    ? place.rows.map((row): TableRow => ({ place, row }))
    : [{ place, row: null }],
);

tableHeader();

for (const [rowIndex, entry] of tableRows.entries()) {
  const { place, row } = entry;
        const rowHeight = row
          ? Math.max(
              25,
              measure(place.code, colWidths[0] - 12, 6.4, true) + 12,
              measure(row.name, colWidths[1] - 12, 6.4, true) + 12,
              measure(row.sku, colWidths[2] - 12, 5.8, true) + 12,
            )
          : 25;
        if (y + rowHeight > bottom) {
          newPage();
          tableHeader();
        }
        if (rowIndex % 2 === 1)
          doc.rect(left, y, width, rowHeight).fill(colors.soft);
        if (row?.difference) {
          doc
            .rect(left, y, 3, rowHeight)
            .fill(row.difference < 0 ? colors.red : colors.green);
        }

        text(
          place.code,
          colX[0] + 6,
          y + 7,
          colWidths[0] - 12,
          6.4,
          true,
        );
        text(
          row?.name ?? "Tom lagerplats",
          colX[1] + 6,
          y + 7,
          colWidths[1] - 12,
          6.4,
          Boolean(row),
          row ? colors.ink : colors.green,
        );
        if (row) {
          text(
            row.sku,
            colX[2] + 6,
            y + 7,
            colWidths[2] - 12,
            5.8,
            true,
          );
        }

        const values = row
          ? [
              amount(row.expected) + " st",
              amount(row.counted) + " st",
              row.unitValue === null
                ? "Ej angivet"
                : formatUnitValue(row.unitValue),
              row.countedValueUnits === null
                ? "–"
                : formatSek(BigInt(row.countedValueUnits)),
              row.valueDifferenceUnits === null
                ? "–"
                : formatSignedSek(row.valueDifferenceUnits),
            ]
          : ["–", "–", "–", "–", "–"];
        values.forEach((value, valueIndex) => {
          const columnIndex = valueIndex + 3;
          const isDifference = columnIndex === 7;
          const difference = row?.valueDifferenceUnits
            ? BigInt(row.valueDifferenceUnits)
            : BigInt(0);
          fittedText(
            value,
            colX[columnIndex] + 5,
            y + 7,
            colWidths[columnIndex] - 10,
            5.8,
            Boolean(row) && (columnIndex < 5 || isDifference),
            isDifference && difference < BigInt(0)
              ? colors.red
              : isDifference && difference > BigInt(0)
                ? colors.green
                : row
                  ? colors.ink
                  : colors.muted,
            "right",
          );
        });

        y += rowHeight;
        line(y);
      }
      y += 14;
      const details = report.companyDetails;
      const footerRows = [
        report.companyName,
        details.organizationNumber
          ? "Org.nr " + details.organizationNumber
          : "",
        details.addressLine1,
        details.addressLine2,
        [details.postalCode, details.city].filter(Boolean).join(" "),
        details.country,
        details.contactEmail,
        details.phone,
        details.website,
      ].filter(Boolean);

      function singleLine(
        value: string,
        maxWidth: number,
        size: number,
        strong = false,
      ) {
        const normalized = clean(value);
        doc.font(strong ? "bold" : "regular").fontSize(size);
        if (doc.widthOfString(normalized) <= maxWidth) return normalized;
        const ellipsis = "…";
        let low = 0;
        let high = normalized.length;
        while (low < high) {
          const middle = Math.ceil((low + high) / 2);
          if (
            doc.widthOfString(normalized.slice(0, middle) + ellipsis) <=
            maxWidth
          )
            low = middle;
          else high = middle - 1;
        }
        return normalized.slice(0, low).trimEnd() + ellipsis;
      }

      const range = doc.bufferedPageRange();
      for (let page = range.start; page < range.start + range.count; page++) {
        doc.switchToPage(page);
        const originalBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        line(748);
        footerRows.forEach((row, index) => {
          const strong = index === 0;
          const size = strong ? 7.2 : 6.8;
          text(
            singleLine(row, 350, size, strong),
            left,
            756 + index * 9,
            350,
            size,
            strong,
            colors.muted,
          );
        });
        text(
          "Sida " + (page + 1) + " av " + range.count,
          left + width - 125,
          756,
          125,
          8,
          false,
          colors.muted,
          "right",
        );
        text(
          "Inventeringsrapport",
          left + width - 125,
          770,
          125,
          6.8,
          false,
          colors.muted,
          "right",
        );
        text(
          singleLine("Rapport-ID " + report.id, 125, 6.4),
          left + width - 125,
          782,
          125,
          6.4,
          false,
          colors.muted,
          "right",
        );
        text(
          "Exporterad " + date(exportedAt),
          left + width - 125,
          794,
          125,
          6.8,
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
