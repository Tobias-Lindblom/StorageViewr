import { z } from "zod";
import { objectIdSchema } from "./organization";
import { locationPartsSchema, locationCode } from "./location";
const manualCode = z.string().trim().max(16).transform((value, context) => {
  const parts = value.split("-");
  const parsed = parts.length === 3 ? locationPartsSchema.safeParse({ zone: parts[0], shelf: parts[1], position: parts[2] }) : null;
  if (!parsed?.success) {
    context.addIssue({ code: "custom", message: "Ange platskoden, till exempel A-01-02." });
    return z.NEVER;
  }
  return locationCode(parsed.data);
});
export const scanLocationSchema = z.union([
  z.object({ qr: z.string().trim().min(1).max(2048), locationId: objectIdSchema.optional() }).strict(),
  z.object({ code: manualCode, locationId: objectIdSchema.optional() }).strict(),
]);
