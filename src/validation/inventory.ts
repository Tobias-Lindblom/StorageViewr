import { z } from "zod";
import { objectIdSchema, quantitySchema } from "./organization";
export const stockScopeSchema = z.object({
  productId: objectIdSchema.optional(), locationId: objectIdSchema.optional(),
}).strict().refine(value => Boolean(value.productId) !== Boolean(value.locationId), "Välj en produkt eller lagerplats.");
export const stockPairSchema = z.object({ productId: objectIdSchema, locationId: objectIdSchema }).strict();
export const stockAdjustmentSchema = stockPairSchema.extend({
  quantity: quantitySchema,
  expectedVersion: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).nullable(),
  reason: z.string().trim().min(2, "Ange en orsak till saldoändringen.").max(500),
}).strict();
export const historyQuerySchema = z.object({
  productId: objectIdSchema.optional(), locationId: objectIdSchema.optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
}).strict().refine(value => Boolean(value.productId) !== Boolean(value.locationId), "Välj en produkt eller lagerplats.");
