import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const schema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, required: true, immutable: true },
  inventorySessionId: { type: Schema.Types.ObjectId, required: true, immutable: true },
  locationId: { type: Schema.Types.ObjectId, required: true, immutable: true },
  locationCode: { type: String, required: true, immutable: true },
  status: { type: String, enum: ["pending", "counted"], required: true, default: "pending" },
  revision: { type: Number, required: true, default: 0 },
  completedBy: Schema.Types.ObjectId,
  completedByName: String,
  completedAt: Date,
}, { collection: "inventorySessionLocations" });
schema.index({ organizationId: 1, inventorySessionId: 1, locationId: 1 }, { unique: true });
schema.index({ organizationId: 1, locationId: 1 });
export type InventorySessionLocationRecord = InferSchemaType<typeof schema>;
export const InventorySessionLocation: Model<InventorySessionLocationRecord> =
  (models.InventorySessionLocation as Model<InventorySessionLocationRecord> | undefined) ?? model<InventorySessionLocationRecord>("InventorySessionLocation", schema);
