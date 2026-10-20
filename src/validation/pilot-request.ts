import { z } from "zod";

export const pilotBusinessTypes = [
  "E-handel",
  "Grossist",
  "Verkstad",
  "Reservdelar",
  "Produktion",
  "Förråd",
  "Annat",
] as const;

export const pilotProductRanges = [
  "Färre än 50",
  "50–250",
  "251–1 000",
  "1 001–5 000",
  "Fler än 5 000",
] as const;

export const pilotLocationRanges = [
  "Färre än 10",
  "10–50",
  "51–250",
  "251–1 000",
  "Fler än 1 000",
] as const;

export const pilotCurrentSystems = [
  "Excel / kalkylblad",
  "Affärssystem / ERP",
  "E-handelsplattform",
  "WMS",
  "Papper / manuellt",
  "Eget system",
  "Annat",
] as const;

export const pilotNeeds = [
  "Lagersaldo",
  "Inventering",
  "Lagerplatser",
  "Avvikelser",
  "Lagerhistorik",
  "Lagervärde",
  "Inventeringsunderlag",
  "QR-märkning",
] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

export const pilotRequestSchema = z
  .object({
    name: z.string().trim().min(2, "Ange ditt namn.").max(100),
    companyName: z
      .string()
      .trim()
      .min(2, "Ange företagets namn.")
      .max(140),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Ange en giltig e-postadress.")
      .max(254),
    phone: optionalText(40),
    businessType: z.enum(pilotBusinessTypes, {
      error: "Välj verksamhetstyp.",
    }),
    productRange: z.enum(pilotProductRanges, {
      error: "Välj ungefärligt antal produkter.",
    }),
    locationRange: z.enum(pilotLocationRanges, {
      error: "Välj ungefärligt antal lagerplatser.",
    }),
    currentSystem: z
      .union([z.enum(pilotCurrentSystems), z.literal("")])
      .optional()
      .transform((value) => value || undefined),
    needs: z.array(z.enum(pilotNeeds)).max(pilotNeeds.length).default([]),
    description: optionalText(1_200),
    website: optionalText(200),
  })
  .strict();

export type PilotRequestInput = z.infer<typeof pilotRequestSchema>;

