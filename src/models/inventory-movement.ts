import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const amount = { type: Number, required: true, min: 0, max: Number.MAX_SAFE_INTEGER, validate: Number.isSafeInteger };
const schema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, immutable: true },
  warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true, immutable: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, immutable: true },
  locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true, immutable: true },
  type: { type: String, enum: ["INITIAL", "ADJUSTMENT", "INVENTORY"], required: true, immutable: true },
  inventorySessionId: { type: Schema.Types.ObjectId, immutable: true },
  previousQuantity: { ...amount, immutable: true },
  newQuantity: { ...amount, immutable: true },
  difference: { type: Number, required: true, validate: Number.isSafeInteger, immutable: true },
  performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
  performedByName: { type: String, required: true, immutable: true },
  productName: { type: String, required: true, immutable: true },
  sku: { type: String, required: true, immutable: true },
  locationCode: { type: String, required: true, immutable: true },
  warehouseName: { type: String, required: true, immutable: true },
  reason: { type: String, required: true, maxlength: 500, immutable: true },
  createdAt: { type: Date, default: Date.now, immutable: true },
}, { collection: "inventoryMovements", versionKey: false });
schema.index({ organizationId: 1, productId: 1, createdAt: -1, _id: -1 });
schema.index({ organizationId: 1, locationId: 1, createdAt: -1, _id: -1 });
schema.index({ organizationId: 1, inventorySessionId: 1, productId: 1, locationId: 1 }, { unique: true, partialFilterExpression: { type: "INVENTORY" } });
export type InventoryMovementRecord = InferSchemaType<typeof schema>;
export const InventoryMovement: Model<InventoryMovementRecord> =
  (models.InventoryMovement as Model<InventoryMovementRecord> | undefined) ?? model<InventoryMovementRecord>("InventoryMovement", schema);
