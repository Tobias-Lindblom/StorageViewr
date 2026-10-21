import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    role: { type: String, enum: ["admin", "warehouse"], required: true },
    tokenHash: { type: String, required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "organization_invitations" },
);

schema.index({ organizationId: 1, email: 1 }, { unique: true });
schema.index({ tokenHash: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

type OrganizationInvitationRecord = InferSchemaType<typeof schema>;
export const OrganizationInvitation: Model<OrganizationInvitationRecord> =
  (models.OrganizationInvitation as Model<OrganizationInvitationRecord> | undefined) ??
  model<OrganizationInvitationRecord>("OrganizationInvitation", schema);
