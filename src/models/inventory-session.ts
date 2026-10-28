import {
  Schema,
  deleteModel,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";
const organizationDetailsSchema = new Schema(
  {
    organizationNumber: String,
    addressLine1: String,
    addressLine2: String,
    postalCode: String,
    city: String,
    country: String,
    contactEmail: String,
    phone: String,
    website: String,
  },
  { _id: false },
);
const incomingValueEntrySchema = new Schema(
  {
    label: { type: String, required: true, maxlength: 120 },
    amountUnits: {
      type: String,
      required: true,
      maxlength: 18,
      match: /^\d{1,18}$/,
    },
  },
  { _id: false },
);
const schema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      required: true,
      immutable: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      required: true,
      immutable: true,
    },
    name: { type: String, required: true, maxlength: 120 },
    warehouseName: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "completed"],
      required: true,
      default: "active",
    },
    startedBy: { type: Schema.Types.ObjectId, required: true },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: Date,
    completedBy: Schema.Types.ObjectId,
    organizationName: String,
    organizationDetails: organizationDetailsSchema,
    startedByName: { type: String, immutable: true },
    completedByName: String,
    establishesBaseline: {
      type: Boolean,
      required: true,
      default: false,
      immutable: true,
    },
    completionSignerName: String,
    completionSignatureImage: Buffer,
    completionSignedAt: Date,
    incomingValueEntries: {
      type: [incomingValueEntrySchema],
      default: [],
    },
    revision: { type: Number, required: true, default: 0 },
  },
  { collection: "inventorySessions", timestamps: true },
);
schema.index({ organizationId: 1, warehouseId: 1, status: 1 });
type InventorySessionRecord = InferSchemaType<typeof schema>;
const cachedInventorySession = models.InventorySession as Model<InventorySessionRecord> | undefined;
if (
  cachedInventorySession &&
  (!cachedInventorySession.schema.path("organizationDetails") ||
    !cachedInventorySession.schema.path("completionSignatureImage") ||
    !cachedInventorySession.schema.path("establishesBaseline") ||
    !cachedInventorySession.schema.path("incomingValueEntries"))
)
  deleteModel("InventorySession");
export const InventorySession: Model<InventorySessionRecord> =
  (models.InventorySession as Model<InventorySessionRecord> | undefined) ??
  model<InventorySessionRecord>("InventorySession", schema);
