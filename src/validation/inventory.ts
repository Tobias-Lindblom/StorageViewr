import { z } from "zod";
import { objectIdSchema, quantitySchema } from "./organization";
export const stockScopeSchema = z.object({
  productId: objectIdSchema.optional(), locationId: objectIdSchema.optional(),
}).strict().refine(value => Boolean(value.productId) !== Boolean(value.locationId), "Välj en produkt eller lagerplats.");
export const stockPairSchema = z.object({ productId: objectIdSchema, locationId: objectIdSchema }).strict();
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
const receiptMovementSchema = z
      .object({
        type: z.literal("RECEIPT"),
        ...singleMovementFields,
        quantity: movementQuantitySchema,
      })
      .strict();
const correctionMovementSchema = z
      .object({
        type: z.literal("CORRECTION"),
        ...singleMovementFields,
        quantity: quantitySchema,
      })
      .strict();
const transferMovementSchema = z
  .object({
    type: z.literal("TRANSFER"),
    productId: objectIdSchema,
    sourceLocationId: objectIdSchema,
    destinationLocationId: objectIdSchema,
    expectedSourceVersion: expectedVersionSchema.unwrap(),
    expectedDestinationVersion: expectedVersionSchema,
    quantity: quantitySchema,
    reason: movementReasonSchema,
  })
  .strict()
  .refine(
    (value) => value.sourceLocationId !== value.destinationLocationId,
    { message: "Välj två olika lagerplatser.", path: ["destinationLocationId"] },
  );
export const stockMovementSchema = z.discriminatedUnion("type", [
  receiptMovementSchema,
  correctionMovementSchema,
  transferMovementSchema,
]);
export const historyQuerySchema = z.object({
  productId: objectIdSchema.optional(), locationId: objectIdSchema.optional(),
  q: z.string().trim().max(100).default(""),
  kind: z.enum(["all", "receipt", "transfer", "inventory", "correction"]).default("all"),
  page: z.coerce.number().int().min(1).max(100000).default(1),
}).strict().refine(value => !(value.productId && value.locationId), "Välj högst en produkt eller lagerplats.");
