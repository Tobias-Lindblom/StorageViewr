import "server-only";
import type { TenantContext } from "@/lib/server/tenant";
import { Product } from "@/models/product";
import { Location } from "@/models/location";
import { InventoryCount } from "@/models/inventory-count";
import { InventorySession } from "@/models/inventory-session";
import { productHealthStages } from "./product-health";

export async function getDashboardInsights(context: TenantContext) {
  const organizationId = context.organizationId;
  const cutoff = new Date(Date.now() - 30 * 86400000);
  const oldCutoff = new Date(Date.now() - 90 * 86400000);
  const [stock, places, discrepancies, last] = await Promise.all([
    Product.aggregate<{ empty: number; unplaced: number; verified: number; needsCounting: number; old: number }>([
      { $match: { organizationId, active: true } }, ...productHealthStages(context),
      { $group: { _id: null,
        empty: { $sum: { $cond: [{ $eq: ["$stockTotal", 0] }, 1, 0] } },
        unplaced: { $sum: { $cond: [{ $eq: ["$locationCount", 0] }, 1, 0] } },
        verified: { $sum: { $cond: [{ $and: ["$unchanged", { $gte: ["$verifiedAt", cutoff] }] }, 1, 0] } },
        old: { $sum: { $cond: [{ $and: [{ $ne: ["$verifiedAt", null] }, { $lt: ["$verifiedAt", oldCutoff] }] }, 1, 0] } },
        needsCounting: { $sum: { $cond: [
          { $or: [
            { $and: ["$unchanged", { $gte: ["$verifiedAt", cutoff] }] },
            { $and: [{ $ne: ["$verifiedAt", null] }, { $lt: ["$verifiedAt", oldCutoff] }] },
          ] }, 0, 1,
        ] } },
      } },
    ]),
    Location.aggregate<{
      summary: { recent: number; stale: number; never: number }[];
      suggestions: { _id: { toString(): string }; code: string; warehouseId: { toString(): string }; countedAt: Date | null }[];
    }>([
      { $match: { organizationId, active: true } },
      { $lookup: {
        from: "inventorySessionLocations", let: { locationId: "$_id" },
        pipeline: [
          { $match: { organizationId, status: "counted", $expr: { $eq: ["$locationId", "$$locationId"] } } },
          { $lookup: {
            from: "inventorySessions", let: { sessionId: "$inventorySessionId" },
            pipeline: [{ $match: { organizationId, status: "completed",
              $expr: { $eq: ["$_id", "$$sessionId"] } } }], as: "session",
          } },
          { $unwind: "$session" },
          { $sort: { "session.completedAt": -1, _id: -1 } }, { $limit: 1 },
          { $project: { completedAt: 1 } },
        ], as: "lastCount",
      } },
      { $set: { countedAt: { $ifNull: [{ $arrayElemAt: ["$lastCount.completedAt", 0] }, null] } } },
      { $facet: {
        summary: [{ $group: { _id: null,
          recent: { $sum: { $cond: [{ $gte: ["$countedAt", cutoff] }, 1, 0] } },
          stale: { $sum: { $cond: [{ $and: [{ $ne: ["$countedAt", null] }, { $lt: ["$countedAt", cutoff] }] }, 1, 0] } },
          never: { $sum: { $cond: [{ $eq: ["$countedAt", null] }, 1, 0] } },
        } }],
        suggestions: [
          { $match: { $or: [{ countedAt: null }, { countedAt: { $lt: cutoff } }] } },
          { $sort: { countedAt: 1, code: 1, _id: 1 } }, { $limit: 7 }, { $project: { code: 1, warehouseId: 1, countedAt: 1 } },
        ],
      } },
    ]),
    InventoryCount.aggregate<{ total: number }>([
      { $match: { organizationId, difference: { $ne: 0 } } },
      { $lookup: { from: "inventorySessions", let: { sessionId: "$inventorySessionId" },
        pipeline: [{ $match: { organizationId, status: "active", $expr: { $eq: ["$_id", "$$sessionId"] } } }],
        as: "session" } },
      { $unwind: "$session" }, { $count: "total" },
    ]),
    InventorySession.findOne({ organizationId, status: "completed" })
      .sort({ completedAt: -1, _id: -1 }).select("name completedAt").lean(),
  ]);
  return {
    health: {
      verifiedProducts: stock[0]?.verified ?? 0,
      needsCountingProducts: stock[0]?.needsCounting ?? 0,
      oldProducts: stock[0]?.old ?? 0,
    },
    emptyProducts: stock[0]?.empty ?? 0,
    unplacedProducts: stock[0]?.unplaced ?? 0,
    recentLocations: places[0]?.summary[0]?.recent ?? 0,
    staleLocations: places[0]?.summary[0]?.stale ?? 0,
    neverCountedLocations: places[0]?.summary[0]?.never ?? 0,
    pendingDiscrepancies: discrepancies[0]?.total ?? 0,
    lastInventory: last ? { id: String(last._id), name: last.name, completedAt: last.completedAt?.toISOString() ?? null } : null,
    suggestedLocations: (places[0]?.suggestions ?? []).map(row => ({
      id: String(row._id), code: row.code, warehouseId: String(row.warehouseId), countedAt: row.countedAt?.toISOString() ?? null,
    })),
  };
}
