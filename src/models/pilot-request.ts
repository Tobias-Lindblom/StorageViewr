import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";
import {
  pilotBusinessTypes,
  pilotCurrentSystems,
  pilotLocationRanges,
  pilotNeeds,
  pilotProductRanges,
} from "@/validation/pilot-request";

const schema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    companyName: { type: String, required: true, trim: true, maxlength: 140 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    phone: { type: String, default: "", trim: true, maxlength: 40 },
    businessType: {
      type: String,
      required: true,
      enum: pilotBusinessTypes,
    },
    productRange: {
      type: String,
      required: true,
      enum: pilotProductRanges,
    },
    locationRange: {
      type: String,
      required: true,
      enum: pilotLocationRanges,
    },
    currentSystem: {
      type: String,
      default: "",
      enum: ["", ...pilotCurrentSystems],
    },
    needs: [{ type: String, enum: pilotNeeds }],
    description: { type: String, default: "", trim: true, maxlength: 1_200 },
    status: {
      type: String,
      required: true,
      enum: ["NEW", "CONTACTED", "APPROVED", "DECLINED"],
      default: "NEW",
    },
  },
  { timestamps: true, collection: "pilotRequests" },
);

schema.index({ createdAt: -1 });
schema.index({ email: 1, createdAt: -1 });
schema.index({ status: 1, createdAt: -1 });

type PilotRequestRecord = InferSchemaType<typeof schema>;
export const PilotRequest: Model<PilotRequestRecord> =
  (models.PilotRequest as Model<PilotRequestRecord> | undefined) ??
  model<PilotRequestRecord>("PilotRequest", schema);

