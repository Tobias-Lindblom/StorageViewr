import "server-only";
import { Types } from "mongoose";
import type { TenantContext } from "@/lib/server/tenant";
import { InventorySessionLocation } from "@/models/inventory-session-location";
import { completedSession } from "@/features/inventory/verification";
import { listMovements, type MovementData } from "@/features/inventory/service";
import { objectIdSchema } from "@/validation/organization";

export type DashboardActivity = {
  id: string; amount: string; label: string; locationCode: string;
  createdAt: string; href: string; tone: "success" | "danger" | "neutral";
};

export async function getDashboardActivity(context: TenantContext, options: { locationId?: string; movements?: MovementData["items"] } = {}): Promise<DashboardActivity[]> {
  const locationId = options.locationId ? objectIdSchema.parse(options.locationId) : undefined;
  const [movements, counts] = await Promise.all([
    context.role === "admin" ? options.movements ? Promise.resolve({ items: options.movements }) : listMovements(context, locationId ? { locationId } : {}) : Promise.resolve({ items: [] }),
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
    .map(row => ({
      id: row.id,
      amount: (row.difference > 0 ? "+" : "") + row.difference.toLocaleString("sv-SE"),
      label: row.productName, locationCode: row.locationCode, createdAt: row.createdAt,
      href: "/inventory/history" + (locationId ? "?locationId=" + locationId : ""),
      tone: row.difference < 0 ? "danger" : "success",
    }));
  const physical: DashboardActivity[] = counts.map(row => ({
    id: "count-" + row._id, amount: "INV", label: "Inventerad plats",
    locationCode: row.locationCode, createdAt: row.completedAt.toISOString(),
    href: "/inventories/" + row.inventorySessionId + (locationId ? "?location=" + locationId : ""),
    tone: "neutral",
  }));
  return [...stock, ...physical].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
}
