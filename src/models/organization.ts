import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
  },
  { timestamps: true, collection: "organizations" },
);
schema.index({ slug: 1 }, { unique: true });
export type OrganizationRecord = InferSchemaType<typeof schema>;
export const Organization: Model<OrganizationRecord> =
  (models.Organization as Model<OrganizationRecord> | undefined) ??
  model<OrganizationRecord>("Organization", schema);
