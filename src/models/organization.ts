import {
  Schema,
  deleteModel,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    organizationNumber: { type: String, default: "", trim: true, maxlength: 32 },
    addressLine1: { type: String, default: "", trim: true, maxlength: 160 },
    addressLine2: { type: String, default: "", trim: true, maxlength: 160 },
    postalCode: { type: String, default: "", trim: true, maxlength: 16 },
    city: { type: String, default: "", trim: true, maxlength: 100 },
    country: { type: String, default: "", trim: true, maxlength: 80 },
    contactEmail: { type: String, default: "", trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, default: "", trim: true, maxlength: 40 },
    website: { type: String, default: "", trim: true, maxlength: 200 },
  },
  { timestamps: true, collection: "organizations" },
);
schema.index({ slug: 1 }, { unique: true });
type OrganizationRecord = InferSchemaType<typeof schema>;
const cachedOrganization = models.Organization as Model<OrganizationRecord> | undefined;
if (cachedOrganization && [
  "organizationNumber", "addressLine1", "addressLine2", "postalCode",
  "city", "country", "contactEmail", "phone", "website",
].some(path => !cachedOrganization.schema.path(path))) {
  deleteModel("Organization");
}
export const Organization: Model<OrganizationRecord> =
  (models.Organization as Model<OrganizationRecord> | undefined) ??
  model<OrganizationRecord>("Organization", schema);
