import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  data: { type: Buffer, required: true, select: false },
}, { timestamps: true, collection: "productPhotos" });
schema.index({ organizationId: 1, productId: 1 }, { unique: true });
export type ProductPhotoRecord = InferSchemaType<typeof schema>;
export const ProductPhoto: Model<ProductPhotoRecord> =
  (models.ProductPhoto as Model<ProductPhotoRecord> | undefined) ?? model<ProductPhotoRecord>("ProductPhoto", schema);
