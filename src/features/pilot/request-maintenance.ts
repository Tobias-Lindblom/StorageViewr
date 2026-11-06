import "server-only";
import { Types } from "mongoose";
import { PilotRequest } from "@/models/pilot-request";
import { pilotRequestExpiry } from "./retention";

export async function recordPilotContact(id: string, contactedAt: Date, now = new Date()) {
  if (!Types.ObjectId.isValid(id) || !Number.isFinite(contactedAt.getTime()) || contactedAt > now) {
    throw new Error("Ange ett giltigt ID och en faktisk kontakttid som inte ligger i framtiden.");
  }
  // A stale command must not shorten retention, revive expired data or create a record.
  return PilotRequest.findOneAndUpdate(
    {
      _id: id,
      expiresAt: { $gt: now },
      lastContactAt: { $lte: contactedAt },
      createdAt: { $lte: contactedAt },
    },
    { $set: { lastContactAt: contactedAt, expiresAt: pilotRequestExpiry(contactedAt), status: "CONTACTED" } },
    { returnDocument: "after", runValidators: true },
  );
}
