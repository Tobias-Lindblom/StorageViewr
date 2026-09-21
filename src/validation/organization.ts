import { z } from "zod";

export const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, "Ogiltigt id.");
export const organizationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().toLowerCase().min(3).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Använd små bokstäver, siffror och bindestreck."),
}).strict();
export const selectOrganizationSchema = z.object({ organizationId: objectIdSchema }).strict();
export const updateOrganizationSchema = organizationSchema.pick({ name: true }).strict();
export const quantitySchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
