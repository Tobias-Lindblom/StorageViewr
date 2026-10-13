import "server-only";
import type { PipelineStage } from "mongoose";
import type { TenantContext } from "@/lib/server/tenant";

export function productStockStages(context: TenantContext): PipelineStage[] {
  return [
    { $lookup: {
      from: "inventoryLevels", let: { productId: "$_id" },
      pipeline: [
        { $match: { organizationId: context.organizationId, $expr: { $eq: ["$productId", "$$productId"] } } },
        { $group: { _id: null, quantity: { $sum: { $toDecimal: { $toLong: "$quantity" } } },
          locations: { $addToSet: "$locationId" } } },
      ], as: "stockSummary",
    } },
    { $set: {
      stockTotal: { $ifNull: [{ $arrayElemAt: ["$stockSummary.quantity", 0] }, 0] },
      locationCount: { $size: { $ifNull: [{ $arrayElemAt: ["$stockSummary.locations", 0] }, []] } },
    } },
  ];
}
