import "server-only";
import { connectDb } from "@/lib/server/db";
import { PilotRequest } from "@/models/pilot-request";
import { pilotRequestExpiry } from "./retention";
import { pilotRequestSchema } from "@/validation/pilot-request";

export async function createPilotRequest(input: unknown) {
  const data = pilotRequestSchema.parse(input);

  // Honeypot submissions receive the same response but are never persisted.
  if (data.website) return { received: true } as const;

  await connectDb();
  const submittedAt = new Date();
  await PilotRequest.create({
    lastContactAt: submittedAt,
    expiresAt: pilotRequestExpiry(submittedAt),
    name: data.name,
    companyName: data.companyName,
    email: data.email,
    phone: data.phone ?? "",
    businessType: data.businessType,
    productRange: data.productRange,
    locationRange: data.locationRange,
    currentSystem: data.currentSystem ?? "",
    needs: data.needs,
    description: data.description ?? "",
    status: "NEW",
  });

  return { received: true } as const;
}

