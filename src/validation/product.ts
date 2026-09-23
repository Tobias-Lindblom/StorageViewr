import { z } from "zod";
export const productSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .min(1, "Ange ett artikelnummer.")
      .max(64)
      .regex(
        /^[A-Z0-9][A-Z0-9._/-]*$/,
        "Artikelnummer får innehålla A–Z, siffror, punkt, bindestreck, snedstreck och understreck.",
      ),
    name: z
      .string()
      .trim()
      .min(2, "Ange ett produktnamn med minst två tecken.")
      .max(160),
    barcode: z.string().trim().max(100).default(""),
    description: z.string().trim().max(2000).default(""),
    imageUrl: z
      .union([
        z.literal(""),
        z
          .url()
          .max(2048)
          .refine(
            (value) => new URL(value).protocol === "https:",
            "Bildlänken måste börja med https://.",
          ),
      ])
      .default(""),
  })
  .strict();
export const productUpdateSchema = productSchema
  .extend({ active: z.boolean() })
  .strict();
export const productQuerySchema = z
  .object({
    q: z.string().trim().max(100).default(""),
    status: z.enum(["active", "inactive", "all"]).default("active"),
    page: z.coerce.number().int().min(1).max(100000).default(1),
  })
  .strict();
export const CSV_MAX_BYTES = 500_000;
export const CSV_MAX_ROWS = 500;
export const productImportSchema = z
  .object({
    csv: z.string().min(1).max(CSV_MAX_BYTES),
    delimiter: z.enum([",", ";"]).default(","),
    mode: z.enum(["preview", "commit"]),
    expectedOrganizationId: z
      .string()
      .regex(/^[a-f0-9]{24}$/i)
      .optional(),
  })
  .strict();
export type ProductInput = z.infer<typeof productSchema>;
