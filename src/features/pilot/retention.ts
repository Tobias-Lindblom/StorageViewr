import { pilotContact } from "@/lib/pilot-contact";

export function pilotRequestExpiry(lastContactAt: Date): Date {
  return new Date(lastContactAt.getTime() + pilotContact.retentionDays * 24 * 60 * 60_000);
}
