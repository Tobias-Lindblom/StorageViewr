import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  email: { type: String, required: true, trim: true, lowercase: true },
  name: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
}, { timestamps: true, collection: "users" });
schema.index({ email: 1 }, { unique: true });
export type UserRecord = InferSchemaType<typeof schema>;
export const User: Model<UserRecord> = (models.User as Model<UserRecord> | undefined) ?? model<UserRecord>("User", schema);
