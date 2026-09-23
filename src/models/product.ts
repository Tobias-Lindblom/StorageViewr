import {
  Schema,
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
    active: { type: Boolean, default: true, required: true },
  },
  { timestamps: true, collection: "products" },
);
schema.index({ organizationId: 1, sku: 1 }, { unique: true });
schema.index({ organizationId: 1, active: 1, name: 1, _id: 1 });
export type ProductRecord = InferSchemaType<typeof schema>;
export const Product: Model<ProductRecord> =
  (models.Product as Model<ProductRecord> | undefined) ??
  model<ProductRecord>("Product", schema);
