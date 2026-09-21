import "server-only";
import { createHash } from "node:crypto";
import { RateLimit } from "@/models/rate-limit";
import { connectDb } from "./db";
import { AppError, isDuplicateKey } from "./errors";

export async function rateLimit(identity: string, limit: number, windowMs = 15 * 60_000) {
  await connectDb();
  const bucket = Math.floor(Date.now() / windowMs);
  const key = createHash("sha256").update(identity + ":" + bucket).digest("hex");
  const expiresAt = new Date((bucket + 1) * windowMs);
  let entry;
  try {
    entry = await RateLimit.findOneAndUpdate({ key }, { $inc: { count: 1 }, $setOnInsert: { expiresAt } }, { upsert: true, returnDocument: "after" });
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    entry = await RateLimit.findOneAndUpdate({ key }, { $inc: { count: 1 } }, { returnDocument: "after" });
  }
  if (!entry || entry.count > limit) throw new AppError(429, "RATE_LIMITED", "För många försök. Försök igen om en stund.");
}
