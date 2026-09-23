import "server-only";
import { parse } from "csv-parse/sync";
import { Product } from "@/models/product";
import { connectDb } from "@/lib/server/db";
import { AppError, isDuplicateKey } from "@/lib/server/errors";
import { requireAdmin, type TenantContext } from "@/lib/server/tenant";
import {
  CSV_MAX_BYTES,
  CSV_MAX_ROWS,
  productImportSchema,
  productSchema,
  type ProductInput,
} from "@/validation/product";

type ImportRow = {
  line: number;
  product: ProductInput | null;
  sku: string;
  name: string;
  errors: string[];
};
const columns = ["sku", "name", "barcode", "description", "imageUrl"];
export function parseProductCsv(
  csv: string,
  delimiter: "," | ";",
): ImportRow[] {
  if (Buffer.byteLength(csv, "utf8") > CSV_MAX_BYTES)
    throw new AppError(413, "CSV_TOO_LARGE", "Filen får vara högst 500 kB.");
  let records: { record: string[]; info: { lines: number } }[];
  try {
    // csv-parse types omit the record/info wrapper returned when info is enabled.
    records = parse(csv, {
      delimiter,
      bom: true,
      skip_empty_lines: true,
      trim: true,
      info: true,
      max_record_size: 12000,
      to: CSV_MAX_ROWS + 2,
    }) as unknown as typeof records;
  } catch {
    throw new AppError(
      400,
      "CSV_INVALID",
      "CSV-filen kunde inte läsas. Kontrollera avgränsare, citattecken och antal kolumner.",
    );
  }
  const header = records.shift()?.record;
  if (
    !header ||
    !header.includes("sku") ||
    !header.includes("name") ||
    new Set(header).size !== header.length ||
    header.some((key) => !columns.includes(key))
  ) {
    throw new AppError(
      400,
      "CSV_HEADERS",
      "Rubrikraden måste innehålla sku och name. Valfria kolumner: barcode, description, imageUrl. Inga andra eller upprepade kolumner tillåts.",
    );
  }
  if (!records.length)
    throw new AppError(400, "CSV_EMPTY", "Filen innehåller inga produkter.");
  if (records.length > CSV_MAX_ROWS)
    throw new AppError(
      400,
      "CSV_TOO_MANY_ROWS",
      "Importera högst 500 produkter åt gången.",
    );
  const rows = records.map(({ record, info }): ImportRow => {
    const raw = Object.fromEntries(
      header.map((key, index) => [key, record[index]]),
    );
    const result = productSchema.safeParse(raw);
    return {
      line: info.lines,
      product: result.success ? result.data : null,
      sku: (raw.sku ?? "").trim().toUpperCase(),
      name: raw.name ?? "",
      errors: result.success
        ? []
        : result.error.issues.map(
            (issue) => issue.path.join(".") + ": " + issue.message,
          ),
    };
  });
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.sku, (counts.get(row.sku) ?? 0) + 1);
  for (const row of rows)
    if ((counts.get(row.sku) ?? 0) > 1)
      row.errors.push("Artikelnumret förekommer flera gånger i filen.");
  return rows;
}
export async function importProducts(context: TenantContext, input: unknown) {
  requireAdmin(context);
  const data = productImportSchema.parse(input);
  if (
    data.mode === "commit" &&
    data.expectedOrganizationId !== context.organizationId.toString()
  ) {
    throw new AppError(
      409,
      "IMPORT_COMPANY_CHANGED",
      "Företaget har ändrats. Förhandsgranska filen igen.",
    );
  }
  const rows = parseProductCsv(data.csv, data.delimiter);
  const existing = await Product.find({
    organizationId: context.organizationId,
    sku: { $in: rows.map((row) => row.sku) },
  })
    .select("sku")
    .lean();
  const existingSkus = new Set(existing.map((item) => item.sku));
  for (const row of rows)
    if (existingSkus.has(row.sku))
      row.errors.push("Artikelnumret finns redan i företaget.");
  const invalid = rows.filter((row) => row.errors.length > 0).length;
  const preview = {
    organizationId: context.organizationId.toString(),
    total: rows.length,
    valid: rows.length - invalid,
    invalid,
    rows: rows.map(({ line, sku, name, errors }) => ({
      line,
      sku,
      name,
      errors,
    })),
  };
  if (data.mode === "preview") return { ...preview, imported: 0 };
  if (invalid)
    throw new AppError(
      409,
      "IMPORT_INVALID",
      "Importen innehåller fel eller dubbletter. Förhandsgranska igen. Inga produkter har sparats.",
    );
  const db = await connectDb();
  try {
    await db.connection.transaction(async (session) => {
      await Product.insertMany(
        rows.map((row) => ({
          ...row.product!,
          organizationId: context.organizationId,
        })),
        { session, ordered: true },
      );
    });
  } catch (error) {
    if (isDuplicateKey(error))
      throw new AppError(
        409,
        "IMPORT_CONFLICT",
        "Ett artikelnummer har hunnit läggas till. Förhandsgranska igen. Inga produkter har sparats.",
      );
    throw error;
  }
  return { ...preview, imported: rows.length };
}
export type ProductImportResult = Awaited<ReturnType<typeof importProducts>>;
