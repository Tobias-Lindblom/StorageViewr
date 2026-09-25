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
const expectedVersionSchema = z
  .number()
  .int()
  .min(1)
  .max(Number.MAX_SAFE_INTEGER)
  .nullable();
const movementReasonSchema = z
  .string()
  .trim()
  .min(2, "Ange en orsak till lagerhändelsen.")
  .max(500);
const movementQuantitySchema = quantitySchema.min(
  1,
  "Antalet måste vara minst 1.",
);
const singleMovementFields = {
  productId: objectIdSchema,
  locationId: objectIdSchema,
  expectedVersion: expectedVersionSchema,
  reason: movementReasonSchema,
};
export const stockMovementSchema = z
  .discriminatedUnion("type", [
    z
      .object({
        type: z.literal("RECEIPT"),
        ...singleMovementFields,
        quantity: movementQuantitySchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("ISSUE"),
        ...singleMovementFields,
        quantity: movementQuantitySchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("CORRECTION"),
        ...singleMovementFields,
        quantity: quantitySchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("TRANSFER"),
        productId: objectIdSchema,
        sourceLocationId: objectIdSchema,
        destinationLocationId: objectIdSchema,
        quantity: movementQuantitySchema,
        expectedSourceVersion: expectedVersionSchema,
        expectedDestinationVersion: expectedVersionSchema,
        reason: movementReasonSchema,
      })
      .strict(),
  ])
  .refine(
    (value) =>
      value.type !== "TRANSFER" ||
      value.sourceLocationId !== value.destinationLocationId,
    { message: "Välj en annan destinationsplats." },
  );
export const historyQuerySchema = z.object({
  productId: objectIdSchema.optional(), locationId: objectIdSchema.optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
}).strict().refine(value => Boolean(value.productId) !== Boolean(value.locationId), "Välj en produkt eller lagerplats.");
