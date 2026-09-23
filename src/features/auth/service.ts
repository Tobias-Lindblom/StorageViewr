import "server-only";
import { User } from "@/models/user";
import { registerSchema, loginSchema } from "@/validation/auth";
import { connectDb } from "@/lib/server/db";
import { AppError } from "@/lib/server/errors";
import {
  hashPassword,
  verifyPassword,
  dummyPasswordHash,
} from "@/lib/server/password";
import { createSession } from "@/lib/server/session";
import { rateLimit } from "@/lib/server/rate-limit";

export async function register(input: unknown) {
  const data = registerSchema.parse(input);
  await connectDb();
  await rateLimit("register:global", 30);
  await rateLimit("register:" + data.email, 5);
  const passwordHash = await hashPassword(data.password);
  const user = await User.create({
    email: data.email,
    name: data.name,
    passwordHash,
  });
  return createSession(user._id);
}
export async function login(input: unknown) {
  const data = loginSchema.parse(input);
  await connectDb();
  await rateLimit("login:global", 200);
  await rateLimit("login:" + data.email, 10);
  const user = await User.findOne({ email: data.email }).select(
    "+passwordHash",
  );
  const valid = await verifyPassword(
    data.password,
    user?.passwordHash ?? dummyPasswordHash,
  );
  if (!user || !valid)
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "Fel e-postadress eller lösenord.",
    );
  return createSession(user._id);
}
