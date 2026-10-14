import "server-only";
import type { TenantContext } from "@/lib/server/tenant";
import { Product } from "@/models/product";
import { Location } from "@/models/location";
import { InventoryCount } from "@/models/inventory-count";
import { productHealthStages } from "./product-health";

export async function getDashboardInsights(context: TenantContext) {
  const organizationId = context.organizationId;
  const cutoff = new Date(Date.now() - 30 * 86400000);
  const oldCutoff = new Date(Date.now() - 90 * 86400000);
  const [stock, places, discrepancies] = await Promise.all([
    Product.aggregate<{ verified: number; needsCounting: number; old: number }>([
      { $match: { organizationId, active: true } }, ...productHealthStages(context),
      { $group: { _id: null,
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
      _id: { toString(): string }; code: string; warehouseId: { toString(): string }; countedAt: Date | null;
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
      { $match: { $or: [{ countedAt: null }, { countedAt: { $lt: cutoff } }] } },
      { $sort: { countedAt: 1, code: 1, _id: 1 } }, { $limit: 7 },
      { $project: { code: 1, warehouseId: 1, countedAt: 1 } },
    ]),
    InventoryCount.aggregate<{ total: number }>([
      { $match: { organizationId, difference: { $ne: 0 } } },
      { $lookup: { from: "inventorySessions", let: { sessionId: "$inventorySessionId" },
        pipeline: [{ $match: { organizationId, status: "active", $expr: { $eq: ["$_id", "$$sessionId"] } } }],
        as: "session" } },
      { $unwind: "$session" }, { $count: "total" },
    ]),
  ]);
  return {
    health: {
      verifiedProducts: stock[0]?.verified ?? 0,
      needsCountingProducts: stock[0]?.needsCounting ?? 0,
      oldProducts: stock[0]?.old ?? 0,
    },
    pendingDiscrepancies: discrepancies[0]?.total ?? 0,
    suggestedLocations: places.map(row => ({
      id: String(row._id), code: row.code, warehouseId: String(row.warehouseId), countedAt: row.countedAt?.toISOString() ?? null,
    })),
  };
}
