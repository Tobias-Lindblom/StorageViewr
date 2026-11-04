import { Schema, deleteModel, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  data: { type: Buffer, required: true, select: false },
  thumbnailData: { type: Buffer, default: undefined, select: false },
}, { timestamps: true, collection: "productPhotos" });
schema.index({ organizationId: 1, productId: 1 }, { unique: true });
type ProductPhotoRecord = InferSchemaType<typeof schema>;
const cachedProductPhoto = models.ProductPhoto as Model<ProductPhotoRecord> | undefined;
if (cachedProductPhoto && !cachedProductPhoto.schema.path("thumbnailData"))
  deleteModel("ProductPhoto");
export const ProductPhoto: Model<ProductPhotoRecord> =
  (models.ProductPhoto as Model<ProductPhotoRecord> | undefined) ?? model<ProductPhotoRecord>("ProductPhoto", schema);
