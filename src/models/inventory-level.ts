import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const safeInteger = { validator: Number.isSafeInteger, message: "Expected safe integer" };
const schema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
  quantity: { type: Number, required: true, min: 0, max: Number.MAX_SAFE_INTEGER, validate: safeInteger },
  version: { type: Number, required: true, min: 1, max: Number.MAX_SAFE_INTEGER, validate: safeInteger },
}, { timestamps: true, collection: "inventoryLevels" });
schema.index({ organizationId: 1, productId: 1, locationId: 1 }, { unique: true });
schema.index({ organizationId: 1, locationId: 1 });
schema.index({ organizationId: 1, warehouseId: 1 });
export type InventoryLevelRecord = InferSchemaType<typeof schema>;
export const InventoryLevel: Model<InventoryLevelRecord> =
  (models.InventoryLevel as Model<InventoryLevelRecord> | undefined) ?? model<InventoryLevelRecord>("InventoryLevel", schema);
