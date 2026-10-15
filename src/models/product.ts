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
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 64,
    },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    barcode: { type: String, default: "", maxlength: 100 },
    description: { type: String, default: "", maxlength: 2000 },
    imageUrl: { type: String, default: "", maxlength: 2048 },
    unitValue: { type: String, default: undefined, match: /^\d{1,14}\.\d{4}$/ },
    // Legacy values are read as SEK and replaced on the next value edit.
    unitValueOre: { type: Number, default: null, min: 0, max: Number.MAX_SAFE_INTEGER,
      validate: { validator: (value: number | null) => value === null || Number.isSafeInteger(value), message: "Styckvärdet måste anges i hela ören." } },
    hasPhoto: { type: Boolean, default: false, required: true },
    active: { type: Boolean, default: true, required: true },
    stockRevision: { type: Number, default: 0, required: true },
  },
  { timestamps: true, collection: "products" },
);
schema.index({ organizationId: 1, sku: 1 }, { unique: true });
schema.index({ organizationId: 1, active: 1, name: 1, _id: 1 });
export type ProductRecord = InferSchemaType<typeof schema>;

// Next.js keeps compiled Mongoose models during development hot reloads. A
// cached strict model from before these fields existed silently drops them,
// and adding paths after compilation does not update the document constructor.
const cachedProduct = models.Product as Model<ProductRecord> | undefined;
if (cachedProduct &&
  (!cachedProduct.schema.path("unitValue") || !cachedProduct.schema.path("unitValueOre"))) {
  deleteModel("Product");
}
export const Product: Model<ProductRecord> =
  (models.Product as Model<ProductRecord> | undefined) ??
  model<ProductRecord>("Product", schema);
