import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const amount = { type: Number, required: true, min: 0, max: Number.MAX_SAFE_INTEGER, validate: Number.isSafeInteger };
const schema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, required: true, immutable: true },
  inventorySessionId: { type: Schema.Types.ObjectId, required: true, immutable: true },
  productId: { type: Schema.Types.ObjectId, required: true, immutable: true },
  locationId: { type: Schema.Types.ObjectId, required: true, immutable: true },
  expectedQuantity: { ...amount, immutable: true },
  countedQuantity: { ...amount, immutable: true },
  difference: { type: Number, required: true, validate: Number.isSafeInteger, immutable: true },
  status: { type: String, enum: ["OPEN", "RESOLVED", "RECOUNTED"], required: true, default: "OPEN" },
  resolution: { type: String, enum: ["APPROVED", "RECOUNTED"], default: undefined },
  resolvedAt: Date,
  resolvedBy: Schema.Types.ObjectId,
  resolutionNote: { type: String, maxlength: 500 },
}, { timestamps: true, collection: "inventoryDiscrepancies" });
schema.index({ organizationId: 1, status: 1, createdAt: -1 });
schema.index({ organizationId: 1, productId: 1, locationId: 1, status: 1 });
schema.index({ organizationId: 1, inventorySessionId: 1, productId: 1, locationId: 1 });
export type InventoryDiscrepancyRecord = InferSchemaType<typeof schema>;
export const InventoryDiscrepancy: Model<InventoryDiscrepancyRecord> =
  (models.InventoryDiscrepancy as Model<InventoryDiscrepancyRecord> | undefined) ??
  model<InventoryDiscrepancyRecord>("InventoryDiscrepancy", schema);
