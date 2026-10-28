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
  red: "#AD354E",
};

const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const amount = (value: number | string) =>
  BigInt(value).toLocaleString("sv-SE");
const quantityLabel = (value: number, singular: string, plural: string) =>
  amount(value) + " " + (value === 1 ? singular : plural);
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
          .translate(left, 29)
          .scale(1.05)
          .path("M12 1 23 7 12 13 1 7 12 1Z")
          .fill("#AA88FF")
          .path("M1 8 11.5 13.7V25L1 19V8Z")
          .fill("#9254DB")
          .path("m12.5 13.7 10.5-5.7v11l-10.5 6V13.7Z")
          .fill("#C6A4F5")
          .restore();
        text("StorageViewr", left + 34, 35, 175, 16, true);

        if (firstPage) {
          y = 76;
        } else {
          line(72);
          y = 94;
        }
      }

      function reportIntro() {
        const panelTop = y;
        const innerLeft = left + 17;
        const innerWidth = width - 34;
        const titleWidth = innerWidth - 170;
        const nameTop = panelTop + 17;
        const nameHeight = measure(report.name, titleWidth, 19, true);
        const metaTop = nameTop + nameHeight + 8;
        const dividerTop = metaTop + 19;
        const scopeTop = dividerTop + 13;
        const panelHeight = scopeTop - panelTop + 27;

        doc
          .roundedRect(left, panelTop, width, panelHeight, 9)
          .fillAndStroke(colors.soft, colors.line);
        text(
          "Exporterad " + date(exportedAt),
          left + width - 205,
          panelTop + 20,
          188,
          7.5,
          false,
          colors.muted,
          "right",
        );
        text(report.name, innerLeft, nameTop, titleWidth, 19, true);
        text(
          report.companyName + " · " + report.warehouseName,
          innerLeft,
          metaTop,
          innerWidth,
          8.5,
          false,
          colors.muted,
        );
        doc
          .moveTo(innerLeft, dividerTop)
          .lineTo(left + width - 17, dividerTop)
          .lineWidth(0.6)
          .strokeColor(colors.line)
          .stroke();
        text(
          quantityLabel(report.summary.places, "lagerplats", "lagerplatser") +
            "  ·  " +
            quantityLabel(
              report.summary.products,
              "unik produkt",
              "unika produkter",
            ) +
            "  ·  " +
            quantityLabel(report.summary.rows, "räknad rad", "räknade rader"),
          innerLeft,
          scopeTop,
          innerWidth,
          8,
          false,
          colors.muted,
        );
        y = panelTop + panelHeight + 19;
      }

      function newPage() {
        doc.addPage();
        header();
      }

      function ensure(height: number) {
        if (y + height > bottom) newPage();
      }

      function sectionHeading(title: string, subtitle: string) {
        const innerLeft = left + 16;
        const innerWidth = width - 32;
        const titleHeight = measure(title, innerWidth, 15, true);
        const subtitleHeight = measure(subtitle, innerWidth, 8.5);
        const panelHeight = 17 + titleHeight + 6 + subtitleHeight + 15;
        ensure(panelHeight + 10);
        const titleTop = y + 17;
        const subtitleTop = titleTop + titleHeight + 6;

        doc
          .roundedRect(left, y, width, panelHeight, 8)
          .fillAndStroke(colors.soft, colors.line);
        text(title, innerLeft, titleTop, innerWidth, 15, true);
        text(
          subtitle,
          innerLeft,
          subtitleTop,
          innerWidth,
          8.5,
          false,
          colors.muted,
        );
        y += panelHeight + 10;
      }

      function valueRow(
        label: string,
        value: string,
        strong = false,
        highlighted = false,
      ) {
        const labelWidth = width - 180;
        const rowHeight = Math.max(
          highlighted ? 38 : 28,
          measure(label, labelWidth, highlighted ? 10 : 8.5, strong) + 14,
        );
        ensure(rowHeight);
        if (highlighted)
          doc.roundedRect(left, y, width, rowHeight, 6).fill(colors.pale);
        text(
          label,
          left + (highlighted ? 12 : 2),
          y + (highlighted ? 12 : 8),
          labelWidth - (highlighted ? 10 : 0),
          highlighted ? 10 : 8.5,
          strong,
          highlighted ? colors.purple : colors.ink,
        );
        text(
          value,
          left + width - 170,
          y + (highlighted ? 11 : 8),
          highlighted ? 158 : 168,
          highlighted ? 11 : 8.5,
          true,
          highlighted ? colors.purple : colors.ink,
          "right",
        );
        y += rowHeight;
      }

      function incomingValueSummary() {
        if (!report.incomingValueEntries.length) return;

        const estimatedHeight =
          250 + report.incomingValueEntries.length * 29;
        const availablePageHeight = bottom - 94;
        if (estimatedHeight <= availablePageHeight && y + estimatedHeight > bottom)
          newPage();
        else if (estimatedHeight > availablePageHeight) ensure(250);

        y += 8;
        sectionHeading(
          "Lagervärde",
          "Totalt varuvärde består av det inventerade lagervärdet och manuellt registrerade inkommande värden.",
        );

        ensure(46);
        doc
          .roundedRect(left, y, width, 36, 6)
          .fillAndStroke(colors.soft, colors.line);
        text(
          "Inventerat lagervärde",
          left + 12,
          y + 11,
          width - 194,
          9,
          true,
        );
        text(
          formatSek(BigInt(report.summary.countedValueUnits)),
          left + width - 170,
          y + 10,
          158,
          9.5,
          true,
          colors.ink,
          "right",
        );
        y += 48;

        ensure(42);
        text(
          "Inkommande varuvärde",
          left + 2,
          y,
          width - 174,
          10,
          true,
        );
        text(
          "Manuellt registrerade poster",
          left + 2,
          y + 17,
          width - 174,
          7.5,
          false,
          colors.muted,
        );
        y += 34;

        for (const entry of report.incomingValueEntries) {
          ensure(29);
          doc.roundedRect(left, y, width, 25, 4).fill(colors.soft);
          text(entry.label, left + 12, y + 8, width - 194, 8.5);
          text(
            formatSek(BigInt(entry.amountUnits)),
            left + width - 170,
            y + 8,
            158,
            8.5,
            true,
            colors.ink,
            "right",
          );
          y += 29;
        }

        ensure(79);
        line(y + 1);
        y += 5;
        valueRow(
          "Summa inkommande",
          formatSek(BigInt(report.summary.incomingValueUnits)),
          true,
        );
        y += 5;
        valueRow(
          "Totalt varuvärde",
          formatSek(BigInt(report.summary.totalGoodsValueUnits)),
          true,
          true,
        );
        y += 8;
      }

      doc.addPage();
      header(true);
      reportIntro();
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

      y += 3;
      ensure(118);
      sectionHeading(
        "Inventerade lagerplatser",
        "Alla registrerade produktrader visas, även de utan avvikelse. Antal anges i styck.",
      );

      const colWidths = [55, 86, 55, 52, 52, 62, 73, 76.28];
      const colX = colWidths.map(
        (_, index) =>
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
        doc.rect(left, y, width, 29).fill(colors.pale);
        headers.forEach((label, index) => {
          const numeric = index >= 3;
          fittedText(
            label,
            colX[index] + 5,
            y + 9,
            colWidths[index] - 10,
            6.2,
            true,
            colors.purple,
            numeric ? "right" : "left",
          );
        });
        y += 29;
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
              29,
              measure(place.code, colWidths[0] - 12, 7, true) + 14,
              measure(row.name, colWidths[1] - 12, 7.2, true) + 14,
              measure(row.sku, colWidths[2] - 12, 6.4, true) + 14,
            )
          : 29;
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

        fittedText(
          place.code,
          colX[0] + 6,
          y + 9,
          colWidths[0] - 12,
          7,
          true,
        );
        fittedText(
          row?.name ?? "Tom lagerplats",
          colX[1] + 6,
          y + 9,
          colWidths[1] - 12,
          7.2,
          Boolean(row),
          row ? colors.ink : colors.green,
        );
        if (row) {
          fittedText(
            row.sku,
            colX[2] + 6,
            y + 9,
            colWidths[2] - 12,
            6.4,
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
            y + 9,
            colWidths[columnIndex] - 10,
            6.6,
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

      incomingValueSummary();

      ensure(report.signature ? 225 : 190);
      sectionHeading(
        "Signering",
        report.signature
          ? "Digital signatur, namnförtydligande och inventeringens tidpunkter."
          : "Tidsuppgifter för inventeringen. Digital signatur saknas i det äldre underlaget.",
      );
      if (report.signature) {
        ensure(142);
        const panelTop = y;
        const panelHeight = 128;
        const signatureWidth = 230;
        const detailsX = left + signatureWidth + 16;
        const detailsWidth = width - signatureWidth - 32;
        doc
          .roundedRect(left, panelTop, width, panelHeight, 7)
          .fillAndStroke(colors.soft, colors.line);
        doc.image(report.signature.image, left + 15, panelTop + 12, {
          fit: [signatureWidth - 30, 62],
          align: "center",
          valign: "center",
        });
        doc
          .moveTo(left + 15, panelTop + 82)
          .lineTo(left + signatureWidth - 15, panelTop + 82)
          .lineWidth(0.5)
          .strokeColor(colors.line)
          .stroke();
        text(
          "Signatur",
          left + 15,
          panelTop + 90,
          signatureWidth - 30,
          7,
          false,
          colors.muted,
        );
        doc
          .moveTo(left + signatureWidth, panelTop + 12)
          .lineTo(left + signatureWidth, panelTop + panelHeight - 12)
          .lineWidth(0.5)
          .strokeColor(colors.line)
          .stroke();
        text(
          "Namnförtydligande",
          detailsX,
          panelTop + 12,
          detailsWidth,
          7,
          false,
          colors.muted,
        );
        fittedText(
          report.signature.signerName,
          detailsX,
          panelTop + 25,
          detailsWidth,
          10,
          true,
        );
        text(
          "Startad",
          detailsX,
          panelTop + 48,
          detailsWidth,
          7,
          false,
          colors.muted,
        );
        fittedText(
          date(report.startedAt),
          detailsX,
          panelTop + 61,
          detailsWidth,
          8,
          true,
        );
        text(
          "Signerad",
          detailsX,
          panelTop + 84,
          detailsWidth,
          7,
          false,
          colors.muted,
        );
        fittedText(
          date(report.signature.signedAt),
          detailsX,
          panelTop + 97,
          detailsWidth,
          8,
          true,
        );
        y += panelHeight + 14;
      } else {
        ensure(108);
        const panelTop = y;
        const panelHeight = 94;
        const columnWidth = width / 2;
        doc
          .roundedRect(left, panelTop, width, panelHeight, 7)
          .fillAndStroke(colors.soft, colors.line);
        text(
          "Digital signatur saknas i underlaget för denna äldre inventering.",
          left + 13,
          panelTop + 12,
          width - 26,
          8,
          false,
          colors.muted,
        );
        line(panelTop + 36);
        text("Startad", left + 13, panelTop + 49, columnWidth - 26, 7, false, colors.muted);
        fittedText(
          date(report.startedAt) + " · " + report.startedBy,
          left + 13,
          panelTop + 64,
          columnWidth - 26,
          8,
          true,
        );
        text("Slutförd", left + columnWidth + 13, panelTop + 49, columnWidth - 26, 7, false, colors.muted);
        fittedText(
          date(report.completedAt) + " · " + report.completedBy,
          left + columnWidth + 13,
          panelTop + 64,
          columnWidth - 26,
          8,
          true,
        );
        y += panelHeight + 14;
      }

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
