import "server-only";
import type { Types } from "mongoose";
import { cache } from "react";
import { User } from "@/models/user";
import { connectDb } from "@/lib/server/db";
import { AppError } from "@/lib/server/errors";
import { updateAccountSchema } from "@/validation/account";

type AccountContext = { userId: Types.ObjectId };

const getAccountById = cache(async (userId: string) => {
  await connectDb();
  const user = await User.findById(userId).select("name email").lean();
  if (!user)
    throw new AppError(401, "UNAUTHENTICATED", "Logga in för att fortsätta.");
  return { name: user.name, email: user.email };
});

export async function getAccount(context: AccountContext) {
  return getAccountById(String(context.userId));
}

export async function updateAccount(context: AccountContext, input: unknown) {
  const data = updateAccountSchema.parse(input);
  await connectDb();
  const user = await User.findOneAndUpdate(
    { _id: context.userId },
    { $set: { name: data.name } },
    { returnDocument: "after", runValidators: true },
  )
    .select("name email")
    .lean();
  if (!user)
    throw new AppError(401, "UNAUTHENTICATED", "Logga in för att fortsätta.");
  return { name: user.name, email: user.email };
}
