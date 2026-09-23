import { z } from "zod";

export const warehouseSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Ange ett lagernamn med minst två tecken.")
      .max(100),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(1)
      .max(20)
      .regex(
        /^[A-Z0-9]+(?:[-_][A-Z0-9]+)*$/,
        "Använd bokstäver A–Z, siffror och bindestreck.",
      ),
    address: z.string().trim().max(300).default(""),
  })
  .strict();
export const warehouseUpdateSchema = warehouseSchema
  .extend({ active: z.boolean() })
  .strict();
