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
      required: true,
      immutable: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      required: true,
      immutable: true,
    },
    name: { type: String, required: true, maxlength: 120 },
    warehouseName: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "completed"],
      required: true,
      default: "active",
    },
    startedBy: { type: Schema.Types.ObjectId, required: true },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: Date,
    completedBy: Schema.Types.ObjectId,
    organizationName: String,
    startedByName: { type: String, immutable: true },
    completedByName: String,
    revision: { type: Number, required: true, default: 0 },
  },
  { collection: "inventorySessions", timestamps: true },
);
schema.index({ organizationId: 1, warehouseId: 1, status: 1 });
export type InventorySessionRecord = InferSchemaType<typeof schema>;
export const InventorySession: Model<InventorySessionRecord> =
  (models.InventorySession as Model<InventorySessionRecord> | undefined) ??
  model<InventorySessionRecord>("InventorySession", schema);
