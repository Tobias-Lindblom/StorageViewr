import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z
  .string()
  .min(12, "Lösenordet måste ha minst 12 tecken.")
  .max(128);
export const loginSchema = z
  .object({ email: emailSchema, password: z.string().min(1).max(128) })
  .strict();
export const registerSchema = loginSchema
  .extend({
    password: passwordSchema,
    name: z.string().trim().min(2).max(100),
  })
  .strict();
