import "server-only";

import PDFDocument from "pdfkit";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const reportColors: Record<
  | "ink"
  | "muted"
  | "purple"
  | "pale"
  | "soft"
  | "line"
  | "green"
  | "greenPale"
  | "red",
  string
> = {
  ink: "#201B2E",
  muted: "#6B6478",
  purple: "#6634BB",
  pale: "#F5F1FC",
  soft: "#FBFAFD",
  line: "#E2DCEB",
  green: "#167448",
  greenPale: "#EDF8F2",
  red: "#AD354E",
};

export const cleanPdfText = (value: string) =>
  value.replace(/\s+/g, " ").trim();

export const formatReportDate = (value: Date) =>
  value.toLocaleString("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export async function loadReportFonts() {
  const fontDirectory = path.join(process.cwd(), "assets/fonts");
  const [regular, bold] = await Promise.all([
    readFile(path.join(fontDirectory, "Roboto-Regular.ttf")),
    readFile(path.join(fontDirectory, "Roboto-Bold.ttf")),
  ]);
  return { regular, bold };
}

export function createReportDocument({
  title,
  exportedAt,
  subject,
  layout = "portrait",
}: {
  title: string;
  exportedAt: Date;
  subject?: string;
  layout?: "portrait" | "landscape";
}) {
  return new PDFDocument({
    size: "A4",
    layout,
    margins: { top: 42, left: 42, right: 42, bottom: 54 },
    bufferPages: true,
    autoFirstPage: false,
    info: {
      Title: title,
      Author: "StorageViewr",
      ...(subject ? { Subject: subject } : {}),
      Creator: "StorageViewr",
      CreationDate: exportedAt,
    },
  });
}

export function installReportFonts(
  doc: PDFKit.PDFDocument,
  fonts: Awaited<ReturnType<typeof loadReportFonts>>,
) {
  doc.registerFont("regular", fonts.regular);
  doc.registerFont("bold", fonts.bold);
}

export function renderPdfBuffer(
  doc: PDFKit.PDFDocument,
  draw: () => void,
) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      draw();
      doc.end();
    } catch (cause) {
      reject(cause);
    }
  });
}

export function drawReportBrand(
  doc: PDFKit.PDFDocument,
  {
    left = 42,
    top = 29,
    scale = 1.05,
  }: { left?: number; top?: number; scale?: number } = {},
) {
  doc
    .save()
    .translate(left, top)
    .scale(scale)
    .path("M12 1 23 7 12 13 1 7 12 1Z")
    .fill("#AA88FF")
    .path("M1 8 11.5 13.7V25L1 19V8Z")
    .fill("#9254DB")
    .path("m12.5 13.7 10.5-5.7v11l-10.5 6V13.7Z")
    .fill("#C6A4F5")
    .restore();

  doc
    .font("bold")
    .fontSize(16)
    .fillColor(reportColors.ink)
    .text("StorageViewr", left + 34, top + 6, { width: 175 });
}
