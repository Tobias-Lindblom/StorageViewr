import "server-only";
import { Types, type PipelineStage } from "mongoose";
import { requireAdmin, type TenantContext } from "@/lib/server/tenant";
import { InventoryMovement } from "@/models/inventory-movement";
import { InventorySessionLocation } from "@/models/inventory-session-location";
import { historyQuerySchema } from "@/validation/inventory";
import { checkScope } from "./service";
import { completedSession } from "./verification";
import { historyMovementTypes, historySearch } from "./history-query";

type EventRow = {
  _id: Types.ObjectId; type: string; productName: string; sku: string;
  locationCode: string; warehouseName: string; reason: string;
  performedByName: string; createdAt: Date; difference?: number;
  previousQuantity?: number; newQuantity?: number;
  inventorySessionId?: Types.ObjectId;
  physical?: boolean;
};
type EventGroup = { _id: string; createdAt: Date; rows: EventRow[] };
export type HistoryItem = {
  id: string; type: string; productName: string; sku: string;
  locationCode: string; warehouseName: string; reason: string;
  performedByName: string; createdAt: string; difference: number | null;
  inventorySessionId: string | null;
  balances: { id: string; productName: string; sku: string; locationCode: string;
    warehouseName: string; previousQuantity: number; newQuantity: number; reason: string }[];
};

export async function listHistory(context: TenantContext, input: unknown) {
  requireAdmin(context);
  const { page: requestedPage, q, kind, productId, locationId } = historyQuerySchema.parse(input);
  if (productId || locationId) await checkScope(context, { productId, locationId });
  const scope = {
    organizationId: context.organizationId,
    type: { $in: historyMovementTypes.all },
    ...(productId ? { productId: new Types.ObjectId(productId) } : {}),
    ...(locationId ? { locationId: new Types.ObjectId(locationId) } : {}),
  };
  const inventoryKey = { $concat: ["inventory:", { $toString: "$inventorySessionId" }, ":", { $toString: "$locationId" }] };
  const eventId = productId ? { $toString: "$_id" } : { $cond: [
    { $and: [{ $eq: ["$type", "INVENTORY"] },
      { $ne: [{ $ifNull: ["$inventorySessionId", null] }, null] }] },
    inventoryKey,
    { $toString: "$_id" },
  ] };
  const pipeline: PipelineStage[] = [
    { $match: scope },
    { $set: { eventId } },
  ];
  if (!productId) {
    pipeline.push({ $unionWith: {
      coll: InventorySessionLocation.collection.name,
      pipeline: [
        { $match: { organizationId: context.organizationId,
          ...(locationId ? { locationId: new Types.ObjectId(locationId) } : {}),
          status: "counted", completedAt: { $type: "date" } } },
        completedSession(context), { $unwind: "$session" },
        { $project: {
          eventId: inventoryKey, type: { $literal: "INVENTORY" }, physical: { $literal: true },
          inventorySessionId: 1, locationCode: 1,
          warehouseName: "$session.warehouseName",
          productName: { $literal: "" }, sku: { $literal: "" },
          reason: "$session.name", performedByName: { $ifNull: ["$completedByName", "$session.completedByName"] },
          createdAt: "$completedAt",
        } },
      ],
    } });
  }
  pipeline.push(
    { $group: { _id: "$eventId", createdAt: { $max: "$createdAt" }, rows: { $push: "$$ROOT" } } },
    ...(kind !== "all" ? [{ $match: { "rows.type": { $in: historyMovementTypes[kind] } } }] : []),
    ...(q ? [{ $match: { $or: historySearch(q, "rows.") } }] : []),
  );
  const sort: PipelineStage = { $sort: { createdAt: -1, _id: -1 } };
  const [result] = await InventoryMovement.aggregate<{
    count: { total: number }[]; items: EventGroup[];
  }>([...pipeline, { $facet: {
    count: [{ $count: "total" }],
    items: [sort, { $skip: (requestedPage - 1) * 20 }, { $limit: 20 }],
  } }]);
  const total = result?.count[0]?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 20));
  const page = Math.min(requestedPage, pages);
  const records = page === requestedPage ? result.items :
    await InventoryMovement.aggregate<EventGroup>([...pipeline, sort, { $skip: (page - 1) * 20 }, { $limit: 20 }]);
  const items: HistoryItem[] = records.map(group => {
    const physical = group.rows.find(row => row.physical);
    const row = physical ?? group.rows[0];
    return {
      id: group._id, type: row.type,
      productName: row.productName, sku: row.sku,
      locationCode: row.locationCode, warehouseName: row.warehouseName, reason: row.reason,
      performedByName: row.performedByName || "Användare",
      createdAt: group.createdAt.toISOString(),
      difference: physical ? null : row.difference ?? 0,
      inventorySessionId: row.inventorySessionId ? String(row.inventorySessionId) : null,
      balances: group.rows.filter(row => !row.physical).map(row => ({
        id: String(row._id), productName: row.productName, sku: row.sku,
        locationCode: row.locationCode, warehouseName: row.warehouseName,
        previousQuantity: row.previousQuantity ?? 0, newQuantity: row.newQuantity ?? 0, reason: row.reason,
      })),
    };
  });
  return { page, pages, total, items };
}
