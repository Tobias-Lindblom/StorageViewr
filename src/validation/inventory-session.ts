import { z } from "zod";
import { objectIdSchema, quantitySchema } from "./organization";
import { parseSekValue, sekToUnits } from "@/lib/money";
const inventoryIdSchema = objectIdSchema.transform(value => value.toLowerCase());
export const startInventorySchema = z.object({
  name: z.string().trim().min(2, "Ange ett namn på inventeringen.").max(120),
  baseline: z.boolean().default(false),
  warehouseId: inventoryIdSchema,
  locationIds: z.array(inventoryIdSchema).min(1, "Välj minst en lagerplats.").max(200)
    .refine(ids => new Set(ids).size === ids.length, "En lagerplats får bara väljas en gång."),
}).strict();
export const saveCountSchema = z.object({
  expectedRevision: quantitySchema,
  confirmReplace: z.boolean().default(false),
  confirmComplete: z.literal(true, { error: "Bekräfta att hela platsen är räknad." }),
  rows: z.array(z.object({
    productId: inventoryIdSchema,
    expectedVersion: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).nullable(),
    countedQuantity: quantitySchema,
  }).strict()).max(500).refine(rows => new Set(rows.map(row => row.productId)).size === rows.length, "Produkten får bara räknas en gång per plats."),
}).strict();
const incomingValueEntrySchema = z.object({
  label: z.string().trim().min(1, "Ange en referens eller beskrivning.").max(120),
  amount: z.string().trim().min(1, "Ange ett värde.").max(30),
}).strict().transform((entry, context) => {
  try {
    const value = parseSekValue(entry.amount);
    if (value === null) throw new Error("missing amount");
    return { label: entry.label, amountUnits: sekToUnits(value).toString() };
  } catch {
    context.addIssue({
      code: "custom",
      path: ["amount"],
      message: "Ange ett värde på minst 0 kr, med högst fyra decimaler.",
    });
    return z.NEVER;
  }
});
export const finishInventorySchema = z.object({
  expectedRevision: quantitySchema,
  confirmed: z.literal(true, { error: "Bekräfta att avvikelserna har granskats." }),
  signerName: z.string().trim().min(2, "Ange namnförtydligande.").max(120),
  signatureDataUrl: z.string()
    .max(400_000, "Signaturen är för stor.")
    .regex(
      /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/,
      "Signaturen har ett ogiltigt format.",
    ),
  incomingValueEntries: z.array(incomingValueEntrySchema).max(
    50,
    "Högst 50 inkommande värdeposter kan läggas till.",
  ).default([]),
  resolutions: z.array(z.object({
    productId: inventoryIdSchema,
    locationId: inventoryIdSchema,
    action: z.enum(["APPROVE", "INVESTIGATE"]),
  }).strict()).max(500).default([]).refine(rows =>
    new Set(rows.map(row => row.productId + ":" + row.locationId)).size === rows.length,
    "En avvikelse får bara hanteras en gång.",
  ),
}).strict();
