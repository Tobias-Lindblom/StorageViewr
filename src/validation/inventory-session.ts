import { z } from "zod";
import { objectIdSchema, quantitySchema } from "./organization";
const inventoryIdSchema = objectIdSchema.transform(value => value.toLowerCase());
export const startInventorySchema = z.object({
  name: z.string().trim().min(2, "Ange ett namn på inventeringen.").max(120),
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
export const finishInventorySchema = z.object({
  expectedRevision: quantitySchema,
  confirmed: z.literal(true, { error: "Bekräfta att avvikelserna har granskats." }),
}).strict();
