import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const schema = new Schema(
  {
    tokenHash: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "sessions" },
);
schema.index({ tokenHash: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export type SessionRecord = InferSchemaType<typeof schema>;
export const Session: Model<SessionRecord> =
  (models.Session as Model<SessionRecord> | undefined) ??
  model<SessionRecord>("Session", schema);
