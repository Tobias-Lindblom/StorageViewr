import "server-only";
import type { PipelineStage } from "mongoose";
import type { TenantContext } from "@/lib/server/tenant";
import { completedSession } from "@/features/inventory/verification";

// Derive stock quality from the same completed counts and versions as the detail view.
export function productHealthStages(context: TenantContext): PipelineStage[] {
  return [
    { $lookup: {
      from: "inventoryLevels", let: { productId: "$_id" },
      pipeline: [
        { $match: { organizationId: context.organizationId, $expr: { $eq: ["$productId", "$$productId"] } } },
        { $lookup: {
          from: "inventoryCounts", let: { productId: "$productId", locationId: "$locationId" },
          pipeline: [
            { $match: { organizationId: context.organizationId, $expr: { $and: [
              { $eq: ["$productId", "$$productId"] }, { $eq: ["$locationId", "$$locationId"] },
            ] } } },
            completedSession(context), { $unwind: "$session" },
            { $sort: { "session.completedAt": -1, countedAt: -1, _id: -1 } }, { $limit: 1 },
          ], as: "counts",
        } },
        { $set: { count: { $arrayElemAt: ["$counts", 0] } } },
        { $project: {
          countedAt: { $ifNull: ["$count.countedAt", null] },
          unchanged: { $and: [
            { $eq: ["$quantity", "$count.countedQuantity"] },
            { $eq: ["$version", { $cond: [
              { $eq: ["$count.difference", 0] }, "$count.expectedVersion",
              { $add: [{ $ifNull: ["$count.expectedVersion", 0] }, 1] },
            ] }] },
          ] },
        } },
      ], as: "levels",
    } },
    { $set: {
      fullyCounted: { $and: [
        { $gt: [{ $size: "$levels" }, 0] },
        { $allElementsTrue: { $map: { input: "$levels", as: "level", in: { $ne: ["$$level.countedAt", null] } } } },
      ] },
      unchanged: { $allElementsTrue: { $map: { input: "$levels", as: "level", in: "$$level.unchanged" } } },
    } },
    { $set: { verifiedAt: { $cond: ["$fullyCounted", { $min: "$levels.countedAt" }, null] } } },
  ];
}
