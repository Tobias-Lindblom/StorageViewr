import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional();
const organizationDetails = {
  organizationNumber: optionalText(32).refine(
    value => !value || /^(?:\d{6}[- ]?\d{4}|\d{12})$/.test(value),
    "Ange organisationsnummer med 10 siffror, till exempel 556016-0680.",
  ),
  addressLine1: optionalText(160),
  addressLine2: optionalText(160),
  postalCode: optionalText(16),
  city: optionalText(100),
  country: optionalText(80),
  contactEmail: optionalText(254).refine(
    value => !value || z.string().email().safeParse(value).success,
    "Ange en giltig e-postadress.",
  ),
  phone: optionalText(40),
  website: optionalText(200).refine(value => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Ange en fullständig webbadress som börjar med https:// eller http://."),
};

export const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Ogiltigt id.");
export const organizationSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(60)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Använd små bokstäver, siffror och bindestreck.",
      ),
    ...organizationDetails,
  })
  .strict();
export const selectOrganizationSchema = z
  .object({ organizationId: objectIdSchema })
  .strict();
export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  ...organizationDetails,
}).strict();
export const quantitySchema = z
  .number()
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER);
