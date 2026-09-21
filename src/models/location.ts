import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
  code: { type: String, required: true },
  zone: { type: String, required: true },
  shelf: { type: String, required: true },
  position: { type: String, required: true },
  qrToken: { type: String, required: true },
  active: { type: Boolean, default: true, required: true },
}, { timestamps: true, collection: "locations" });
schema.index({ organizationId: 1, warehouseId: 1, code: 1 }, { unique: true });
schema.index({ qrToken: 1 }, { unique: true });
schema.index({ organizationId: 1, active: 1 });
export type LocationRecord = InferSchemaType<typeof schema>;
export const Location: Model<LocationRecord> =
  (models.Location as Model<LocationRecord> | undefined) ?? model<LocationRecord>("Location", schema);
