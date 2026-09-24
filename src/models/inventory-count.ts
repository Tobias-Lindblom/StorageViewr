import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const amount = { type: Number, required: true, min: 0, max: Number.MAX_SAFE_INTEGER, validate: Number.isSafeInteger, immutable: true };
const schema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, required: true, immutable: true },
  inventorySessionId: { type: Schema.Types.ObjectId, required: true, immutable: true },
  locationId: { type: Schema.Types.ObjectId, required: true, immutable: true },
  productId: { type: Schema.Types.ObjectId, required: true, immutable: true },
  productName: { type: String, required: true, immutable: true },
  sku: { type: String, required: true, immutable: true },
  expectedQuantity: amount,
  expectedVersion: { type: Number, default: null, min: 1, max: Number.MAX_SAFE_INTEGER, immutable: true },
  countedQuantity: amount,
  difference: { type: Number, required: true, validate: Number.isSafeInteger, immutable: true },
  countedBy: { type: Schema.Types.ObjectId, required: true, immutable: true },
  countedByName: { type: String, required: true, immutable: true },
  countedAt: { type: Date, required: true, default: Date.now, immutable: true },
}, { collection: "inventoryCounts", versionKey: false });
schema.index({ organizationId: 1, inventorySessionId: 1, productId: 1, locationId: 1 }, { unique: true });
schema.index({ organizationId: 1, productId: 1, inventorySessionId: 1 });
export type InventoryCountRecord = InferSchemaType<typeof schema>;
export const InventoryCount: Model<InventoryCountRecord> =
  (models.InventoryCount as Model<InventoryCountRecord> | undefined) ?? model<InventoryCountRecord>("InventoryCount", schema);
