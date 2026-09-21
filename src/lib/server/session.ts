import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { Types } from "mongoose";
import { connectDb } from "./db";
import { AppError } from "./errors";
import { Session } from "@/models/session";
import { User } from "@/models/user";

export const sessionCookie = process.env.NODE_ENV === "production" ? "__Host-storageviewr" : "storageviewr";
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export async function createSession(userId: Types.ObjectId) {
  await connectDb();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 86400_000);
  await Session.create({ tokenHash: hashToken(token), userId, expiresAt });
  return { token, expiresAt };
}
export async function resolveSession(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new AppError(401, "UNAUTHENTICATED", "Logga in för att fortsätta.");
  await connectDb();
  const session = await Session.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } });
  if (!session || !(await User.exists({ _id: session.userId }))) {
    throw new AppError(401, "UNAUTHENTICATED", "Sessionen har gått ut. Logga in igen.");
  }
  return session;
}
export async function requireSession() {
  return resolveSession((await cookies()).get(sessionCookie)?.value);
}
export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(sessionCookie, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt,
  });
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get(sessionCookie)?.value;
  if (token) {
    await connectDb();
    await Session.deleteOne({ tokenHash: hashToken(token) });
  }
  jar.delete(sessionCookie);
}
