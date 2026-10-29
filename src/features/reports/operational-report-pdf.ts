import "server-only";

import { formatSek } from "@/lib/money";
import type { DiscrepancyReport, HealthReport } from "./operational-report-data";
import {
  cleanPdfText as clean,
  createReportDocument,
  drawReportBrand,
  formatReportDate as date,
  installReportFonts,
  loadReportFonts,
  renderPdfBuffer,
  reportColors as colors,
} from "@/lib/server/pdf-report";

function drawHeader(doc: PDFKit.PDFDocument, title: string, company: string, exportedAt: Date, width: number) {
  drawReportBrand(doc);
  doc.font("bold").fontSize(23).text(title, 42, 76, { width });
  doc.font("regular").fontSize(8.5).fillColor(colors.muted).text(company + " · Exporterad " + date(exportedAt), 42, 108, { width });
  doc.moveTo(42, 130).lineTo(42 + width, 130).lineWidth(0.6).strokeColor(colors.line).stroke();
}

function footer(doc: PDFKit.PDFDocument, company: string, title: string, exportedAt: Date) {
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index++) {
    doc.switchToPage(index);
    const page = doc.page;
    const y = page.height - 39;
    doc.moveTo(42, y - 10).lineTo(page.width - 42, y - 10).lineWidth(0.5).strokeColor(colors.line).stroke();
    doc.font("regular").fontSize(7).fillColor(colors.muted).text(company, 42, y, { width: 220 });
    doc.text("Sida " + (index + 1) + " av " + range.count, page.width - 150, y, { width: 108, align: "right" });
    doc.text(title + " · " + date(exportedAt), page.width - 300, y + 11, { width: 258, align: "right" });
  }
}

export async function renderDiscrepancyReport(report: DiscrepancyReport, exportedAt = new Date()) {
  const fonts = await loadReportFonts();
  const doc = createReportDocument({ title: "Avvikelserapport", exportedAt, layout: "landscape" });
  installReportFonts(doc, fonts);
  return renderPdfBuffer(doc, () => {
    const left = 42, width = 757.89, bottom = 520;
    let y = 150;
    const columns = [92, 145, 78, 65, 58, 58, 58, 84, 120];
    const headers = ["Lagerplats", "Produkt", "Art.nr", "Registrerat", "Räknat", "Avvikelse", "Värdeavvikelse", "Status", "Kommentar"];
    const align = (index: number) => index >= 3 && index <= 6 ? "right" as const : "left" as const;
    const text = (value: string, x: number, top: number, w: number, size = 7, boldText = false, color = colors.ink, side: "left" | "right" = "left") =>
      doc.font(boldText ? "bold" : "regular").fontSize(size).fillColor(color).text(clean(value), x, top, { width: w, align: side, lineGap: 1 });
    const header = (first: boolean) => {
      doc.addPage();
      if (first) { drawHeader(doc, "Avvikelserapport", report.companyName, exportedAt, width); y = 150; }
      else { drawReportBrand(doc, { left, top: 24, scale: 0.8 }); doc.font("bold").fontSize(12).fillColor(colors.ink).text("Avvikelserapport", left + 180, 34); y = 68; }
      doc.rect(left, y, width, 24).fill(colors.pale);
      let x = left;
      headers.forEach((label, index) => { text(label, x + 5, y + 8, columns[index] - 10, 6.5, true, colors.purple, align(index)); x += columns[index]; });
      y += 24;
    };
    header(true);
    report.rows.forEach(row => {
      const values = [row.warehouseName + " · " + row.locationCode, row.productName, row.sku,
        row.expectedQuantity.toLocaleString("sv-SE"), row.countedQuantity.toLocaleString("sv-SE"),
        (row.difference > 0 ? "+" : "") + row.difference.toLocaleString("sv-SE"),
        row.valueDifferenceUnits === null ? "–" : (row.difference > 0 ? "+" : "") + formatSek(BigInt(row.valueDifferenceUnits)),
        row.status === "OPEN" ? "Öppen" : row.status === "RECOUNTED" ? "Omräknad" : "Löst", row.comment || "–"];
      const heights = values.map((value, index) => doc.font(index === 5 ? "bold" : "regular").fontSize(7).heightOfString(clean(value), { width: columns[index] - 10, lineGap: 1 }));
      const height = Math.max(27, Math.max(...heights) + 12);
      if (y + height > bottom) header(false);
      if (Math.floor(y / 27) % 2 === 0) doc.rect(left, y, width, height).fill(colors.soft);
      let x = left;
      values.forEach((value, index) => { text(value, x + 5, y + 7, columns[index] - 10, 7, index === 5, index === 5 ? (row.difference < 0 ? colors.red : colors.green) : colors.ink, align(index)); x += columns[index]; });
      doc.moveTo(left, y + height).lineTo(left + width, y + height).lineWidth(0.35).strokeColor(colors.line).stroke();
      y += height;
    });
    if (!report.rows.length) text("Inga avvikelser registrerade.", left, y + 16, width, 10, false, colors.muted);
    footer(doc, report.companyName, "Avvikelserapport", exportedAt);
  });
}

export async function renderHealthReport(report: HealthReport, exportedAt = new Date()) {
  const fonts = await loadReportFonts();
  const doc = createReportDocument({ title: "Lagerhälsorapport", exportedAt });
  installReportFonts(doc, fonts);
  return renderPdfBuffer(doc, () => {
    const left = 42, width = 511.28, bottom = 733;
    let y = 150;
    const text = (value: string, x: number, top: number, w: number, size = 8, boldText = false, color = colors.ink, align: "left" | "right" = "left") =>
      doc.font(boldText ? "bold" : "regular").fontSize(size).fillColor(color).text(clean(value), x, top, { width: w, align, lineGap: 2 });
    const newPage = (first = false) => { doc.addPage(); if (first) { drawHeader(doc, "Lagerhälsorapport", report.companyName, exportedAt, width); y = 150; } else { drawReportBrand(doc, { left, top: 24, scale: 0.8 }); doc.font("bold").fontSize(12).fillColor(colors.ink).text("Lagerhälsorapport", left + 180, 34); y = 68; } };
    newPage(true);
    const metrics: [string, string][] = [
      ["Lagerhälsa", report.health.score === null ? "–" : report.health.score + "%"],
      ["Verifierade", report.health.trustedPositions.toLocaleString("sv-SE") + " / " + report.health.totalPositions.toLocaleString("sv-SE")],
      ["Öppna avvikelser", report.health.openDiscrepancies.toLocaleString("sv-SE")],
      ["Aldrig inventerade", report.health.neverCounted.toLocaleString("sv-SE")],
    ];
    const gap = 9, card = (width - gap * 3) / 4;
    metrics.forEach(([label, value], index) => { const x = left + index * (card + gap); doc.roundedRect(x, y, card, 55, 7).fillAndStroke(colors.pale, colors.line); text(label, x + 10, y + 9, card - 20, 7, false, colors.muted); text(value, x + 10, y + 27, card - 20, 14, true); });
    y += 76;
    text("Sammanfattning", left, y, width, 13, true); y += 24;
    const summary = [
      ["Verifierade", report.health.verified], ["Snart dags", report.health.dueSoon],
      ["Behöver verifieras", report.health.needsVerification], ["Gamla kontroller", report.health.stale],
      ["Aldrig inventerade", report.health.neverCounted], ["Öppna avvikelser", report.health.openDiscrepancies],
    ] as const;
    summary.forEach(([label, value], index) => { const top = y + Math.floor(index / 2) * 31; const x = left + (index % 2) * (width / 2 + 4); doc.roundedRect(x, top, width / 2 - 5, 25, 5).fill(colors.soft); text(label, x + 9, top + 8, 150, 7.5, false, colors.muted); text(value.toLocaleString("sv-SE"), x + 165, top + 8, 70, 8, true, colors.ink, "right"); });
    y += 112;
    text("Behöver uppmärksamhet", left, y, width, 13, true); y += 24;
    const columns = [95, 175, 100, 141];
    const heads = ["Lagerplats", "Produkt", "Orsak", "Senast verifierad"];
    const tableHeader = () => { doc.rect(left, y, width, 23).fill(colors.pale); let x = left; heads.forEach((head, index) => { text(head, x + 7, y + 8, columns[index] - 14, 6.7, true, colors.purple); x += columns[index]; }); y += 23; };
    tableHeader();
    for (const row of report.health.attentionItems) {
      const reason = row.reason === "OPEN_DISCREPANCY" ? "Öppen avvikelse" : row.reason === "NEVER_COUNTED" ? "Aldrig inventerad" : row.reason === "STALE" ? "Gammal kontroll" : row.reason === "DUE_SOON" ? "Snart dags" : "Behöver verifieras";
      const values = [row.warehouseName + " · " + row.locationCode, row.productName + " · " + row.sku, reason, row.verifiedAt ? new Date(row.verifiedAt).toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" }) : "–"];
      const height = Math.max(28, ...values.map((value, index) => doc.font("regular").fontSize(7.2).heightOfString(value, { width: columns[index] - 14, lineGap: 1 }) + 12));
      if (y + height > bottom) { newPage(); tableHeader(); }
      let x = left; values.forEach((value, index) => { text(value, x + 7, y + 7, columns[index] - 14, 7.2); x += columns[index]; });
      doc.moveTo(left, y + height).lineTo(left + width, y + height).lineWidth(0.35).strokeColor(colors.line).stroke(); y += height;
    }
    if (!report.health.attentionItems.length) text("Inga lagerpositioner behöver uppmärksamhet.", left, y + 15, width, 9, false, colors.green);
    footer(doc, report.companyName, "Lagerhälsorapport", exportedAt);
  });
}
