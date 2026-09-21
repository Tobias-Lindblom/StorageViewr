import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  code: { type: String, required: true, uppercase: true, trim: true, maxlength: 20 },
  address: { type: String, default: "", maxlength: 300 },
  active: { type: Boolean, default: true, required: true },
  // Serializes location mutations against warehouse deactivation.
  locationRevision: { type: Number, default: 0, required: true },
}, { timestamps: true, collection: "warehouses" });
schema.index({ organizationId: 1, code: 1 }, { unique: true });
schema.index({ organizationId: 1, active: 1 });
export type WarehouseRecord = InferSchemaType<typeof schema>;
export const Warehouse: Model<WarehouseRecord> =
  (models.Warehouse as Model<WarehouseRecord> | undefined) ?? model<WarehouseRecord>("Warehouse", schema);
