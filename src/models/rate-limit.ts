import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const schema = new Schema(
  {
    key: { type: String, required: true },
    count: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
  },
  { collection: "rateLimits" },
);
schema.index({ key: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
type RateLimitRecord = InferSchemaType<typeof schema>;
export const RateLimit: Model<RateLimitRecord> =
  (models.RateLimit as Model<RateLimitRecord> | undefined) ??
  model<RateLimitRecord>("RateLimit", schema);
