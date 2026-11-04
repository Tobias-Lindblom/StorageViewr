import "server-only";
import { Types } from "mongoose";
import type { TenantContext } from "@/lib/server/tenant";
import { InventorySessionLocation } from "@/models/inventory-session-location";
import { InventoryMovement } from "@/models/inventory-movement";
import { completedSession } from "@/features/inventory/verification";
import { checkScope, type MovementData } from "@/features/inventory/service";
import { objectIdSchema } from "@/validation/organization";

export type DashboardActivity = {
  id: string; amount: string; label: string; locationCode: string;
  createdAt: string; href: string; tone: "success" | "danger" | "neutral";
};

export async function getDashboardActivity(context: TenantContext, options: { locationId?: string; movements?: MovementData["items"] } = {}): Promise<DashboardActivity[]> {
  const locationId = options.locationId ? objectIdSchema.parse(options.locationId) : undefined;
  if (context.role === "admin" && locationId && !options.movements)
    await checkScope(context, { locationId });
  const [movements, counts] = await Promise.all([
    context.role === "admin"
      ? options.movements
        ? Promise.resolve({ items: options.movements })
        : InventoryMovement.find({
            organizationId: context.organizationId,
            ...(locationId ? { locationId } : {}),
            type: { $in: ["RECEIPT", "TRANSFER", "CORRECTION", "INVENTORY"] },
          })
            .select("type inventorySessionId transferDirection counterpartLocationCode difference productName locationCode createdAt")
            .sort({ createdAt: -1, _id: -1 })
            .limit(20)
            .lean()
            .then(rows => ({ items: rows.map(row => ({
              id: String(row._id),
              type: row.type,
              inventorySessionId: row.inventorySessionId ? String(row.inventorySessionId) : null,
              transferDirection: row.transferDirection ?? null,
              counterpartLocationCode: row.counterpartLocationCode ?? null,
              difference: row.difference,
              productName: row.productName,
              locationCode: row.locationCode,
              createdAt: row.createdAt.toISOString(),
            })) }))
      : Promise.resolve({ items: [] }),
    InventorySessionLocation.aggregate<{
      _id: Types.ObjectId; inventorySessionId: Types.ObjectId; locationId: Types.ObjectId;
      locationCode: string; completedAt: Date;
    }>([
      { $match: { organizationId: context.organizationId, ...(locationId ? { locationId: new Types.ObjectId(locationId) } : {}), status: "counted", completedAt: { $type: "date" } } },
      completedSession(context), { $unwind: "$session" },
      { $sort: { completedAt: -1, _id: -1 } }, { $limit: 3 },
      { $project: { inventorySessionId: 1, locationId: 1, locationCode: 1, completedAt: 1 } },
    ]),
  ]);
  const sessions = new Set(counts.map(row => String(row.inventorySessionId) + ":" + row.locationCode));
  const stock: DashboardActivity[] = movements.items
    .filter(row => row.type !== "INVENTORY" || !sessions.has(row.inventorySessionId + ":" + row.locationCode))
    .filter(row => locationId || row.type !== "TRANSFER" || row.transferDirection === "SOURCE")
    .map(row => ({
      id: row.id,
      amount: row.type === "TRANSFER"
        ? "↔ " + Math.abs(row.difference).toLocaleString("sv-SE")
        : (row.difference > 0 ? "+" : "") + row.difference.toLocaleString("sv-SE"),
      label: row.productName,
      locationCode: row.type === "TRANSFER" && row.counterpartLocationCode
        ? (row.transferDirection === "DESTINATION"
            ? row.counterpartLocationCode + " → " + row.locationCode
            : row.locationCode + " → " + row.counterpartLocationCode)
        : row.locationCode,
      createdAt: row.createdAt,
      href: "/inventory/history" + (locationId ? "?locationId=" + locationId : ""),
      tone: row.type === "TRANSFER" ? "neutral" : row.difference < 0 ? "danger" : "success",
    }));
  const physical: DashboardActivity[] = counts.map(row => ({
    id: "count-" + row._id, amount: "INV", label: "Inventerad plats",
    locationCode: row.locationCode, createdAt: row.completedAt.toISOString(),
    href: "/inventories/" + row.inventorySessionId + (locationId ? "?location=" + locationId : ""),
    tone: "neutral",
  }));
  return [...stock, ...physical].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
}
