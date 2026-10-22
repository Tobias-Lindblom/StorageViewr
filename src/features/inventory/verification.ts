import "server-only";
import { Types } from "mongoose";
import type { TenantContext } from "@/lib/server/tenant";
import { InventoryCount, type InventoryCountRecord } from "@/models/inventory-count";
import { InventorySessionLocation } from "@/models/inventory-session-location";
import { stockScopeSchema } from "@/validation/inventory";
import type { StockData } from "./service";
import { getInventoryHealthSummary } from "./inventory-health";

type Count = InventoryCountRecord & { _id: Types.ObjectId };
export type VerificationData = {
  countedAt: string | null;
  sessionId: string | null;
  state: "never" | "partial" | "changed" | "old" | "verified";
  checked: number;
  total: number;
  corrections: number;
  productScope: boolean;
  verifiedQuantity: string | null;
  healthScore: number | null;
  openDiscrepancies: number;
};
export const completedSession = (context: TenantContext) => ({
  $lookup: {
    from: "inventorySessions", let: { sessionId: "$inventorySessionId" },
    pipeline: [{ $match: { organizationId: context.organizationId, status: "completed",
      $expr: { $eq: ["$_id", "$$sessionId"] } } }],
    as: "session",
  },
});

export async function getVerification(context: TenantContext, input: unknown, stock: StockData): Promise<VerificationData> {
  const scope = stockScopeSchema.parse(input);
  const productScope = Boolean(scope.productId);
  const filter = { organizationId: context.organizationId };
  let counts: Count[] = [];
  let fallbackDate: Date | null = null;
  let sessionId: string | null = null;
  if (scope.productId) {
    const latest = await InventoryCount.aggregate<Count>([
      { $match: { ...filter, productId: new Types.ObjectId(scope.productId) } },
      completedSession(context), { $unwind: "$session" },
      { $sort: { "session.completedAt": -1, countedAt: -1, _id: -1 } },
      { $group: { _id: "$locationId", count: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$count" } },
    ]);
    counts = latest;
  } else {
    const places = await InventorySessionLocation.aggregate<{
      inventorySessionId: Types.ObjectId; completedAt?: Date;
    }>([
      { $match: { ...filter, locationId: new Types.ObjectId(scope.locationId), status: "counted" } },
      completedSession(context), { $unwind: "$session" },
      { $sort: { "session.completedAt": -1, _id: -1 } }, { $limit: 1 },
    ]);
    const place = places[0];
    if (place) {
      sessionId = String(place.inventorySessionId);
      fallbackDate = place.completedAt ?? null;
      counts = await InventoryCount.find({ ...filter, locationId: scope.locationId,
        inventorySessionId: place.inventorySessionId }).lean();
    }
  }
  const relevant = productScope ? counts.filter(count =>
    stock.items.some(level => level.locationId === String(count.locationId))) : counts;
  const matching = stock.items.filter(level => relevant.some(count =>
    String(count.productId) === level.productId && String(count.locationId) === level.locationId));
  // Completion only increments the level version when it corrects a difference.
  const unchanged = relevant.every(count => {
    const level = stock.items.find(row => row.productId === String(count.productId) && row.locationId === String(count.locationId));
    const expected = count.difference === 0 ? count.expectedVersion : (count.expectedVersion ?? 0) + 1;
    return (level?.version ?? null) === expected && (level?.quantity ?? 0) === count.countedQuantity;
  });
  const dates = relevant.length ? relevant.map(row => row.countedAt) : counts.map(row => row.countedAt);
  const date = dates.length ? new Date(Math.min(...dates.map(value => value.getTime()))) : fallbackDate;
  if (productScope && relevant.length) {
    const oldest = relevant.reduce((a, b) => a.countedAt < b.countedAt ? a : b);
    sessionId = String(oldest.inventorySessionId);
  }
  const allCounted = matching.length === stock.items.length && (!productScope || stock.items.length > 0);
  let healthScore: number | null = null;
  let openDiscrepancies = 0;
  let state: VerificationData["state"] = !date ? "never" : !allCounted ? "partial" : !unchanged ? "changed" :
    Date.now() - date.getTime() >= 30 * 86400000 ? "old" : "verified";
  // Product/location detail views consume the same ledger-based source of truth
  // as Lagerhälsa. Empty locations retain their location-count fallback above.
  if (stock.items.length) {
    const health = await getInventoryHealthSummary(context);
    const positions = health.positions.filter(row => productScope
      ? row.productId === scope.productId
      : row.locationId === scope.locationId);
    if (positions.length) {
      healthScore = Math.round(positions.filter(row => row.trusted).length / positions.length * 100);
      openDiscrepancies = positions.filter(row => row.reason === "OPEN_DISCREPANCY").length;
      const checkedPositions = positions.filter(row => row.verifiedAt);
      if (!checkedPositions.length) state = "never";
      else if (checkedPositions.length !== positions.length) state = "partial";
      else if (positions.some(row => ["OPEN_DISCREPANCY", "MANUAL_CORRECTION", "LEDGER_MISMATCH"].includes(row.reason))) state = "changed";
      else if (positions.some(row => ["NEEDS_VERIFICATION", "STALE"].includes(row.reason))) state = "old";
      else state = "verified";
    }
  }
  const verifiedQuantity = allCounted
    ? relevant.reduce((sum, row) => sum + BigInt(row.countedQuantity), BigInt(0)).toString()
    : null;
  return { countedAt: date?.toISOString() ?? null, sessionId, state,
    checked: matching.length, total: stock.items.length,
    corrections: relevant.filter(row => row.difference !== 0).length, productScope,
    verifiedQuantity, healthScore, openDiscrepancies };
}
