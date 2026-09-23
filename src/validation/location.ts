import { z } from "zod";
import { objectIdSchema } from "./organization";

const zone = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{1,8}$/, "Zon ska ha 1–8 bokstäver A–Z eller siffror.");
const numberPart = z
  .string()
  .trim()
  .regex(/^\d{1,3}$/, "Ange ett nummer mellan 1 och 999.")
  .refine((value) => Number(value) >= 1, "Numret måste vara minst 1.")
  .transform((value) => String(Number(value)).padStart(2, "0"));
export const locationPartsSchema = z
  .object({ zone, shelf: numberPart, position: numberPart })
  .strict();
export const locationSchema = locationPartsSchema
  .extend({ warehouseId: objectIdSchema })
  .strict();
export const locationUpdateSchema = locationPartsSchema
  .extend({ active: z.boolean() })
  .strict();
export const locationBatchSchema = z
  .object({
    warehouseId: objectIdSchema,
    zone,
    shelf: numberPart,
    startPosition: z.number().int().min(1).max(999),
    count: z.number().int().min(1).max(100),
  })
  .strict()
  .refine(
    (data) => data.startPosition + data.count - 1 <= 999,
    "Sista positionen får vara högst 999.",
  );
export const qrTokenSchema = z.string().regex(/^[a-f0-9]{48}$/);
export const locationCode = (parts: {
  zone: string;
  shelf: string;
  position: string;
}) => [parts.zone, parts.shelf, parts.position].join("-");
