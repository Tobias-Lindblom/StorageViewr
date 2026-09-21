import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["admin", "warehouse"], required: true },
}, { timestamps: true, collection: "memberships" });
schema.index({ organizationId: 1, userId: 1 }, { unique: true });
schema.index({ userId: 1 });
export type MembershipRecord = InferSchemaType<typeof schema>;
export const Membership: Model<MembershipRecord> = (models.Membership as Model<MembershipRecord> | undefined) ?? model<MembershipRecord>("Membership", schema);
