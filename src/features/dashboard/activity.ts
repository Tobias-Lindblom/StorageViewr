import "server-only";
import type { Types } from "mongoose";
import type { TenantContext } from "@/lib/server/tenant";
import { InventorySessionLocation } from "@/models/inventory-session-location";
import { completedSession } from "@/features/inventory/verification";
import { listMovements } from "@/features/inventory/service";

export type DashboardActivity = {
  id: string; amount: string; label: string; locationCode: string;
  createdAt: string; href: string; tone: "success" | "danger" | "neutral";
};

export async function getDashboardActivity(context: TenantContext): Promise<DashboardActivity[]> {
  const [movements, counts] = await Promise.all([
    context.role === "admin" ? listMovements(context, {}) : Promise.resolve({ items: [] }),
    InventorySessionLocation.aggregate<{
      _id: Types.ObjectId; inventorySessionId: Types.ObjectId; locationId: Types.ObjectId;
      locationCode: string; completedAt: Date;
    }>([
      { $match: { organizationId: context.organizationId, status: "counted", completedAt: { $type: "date" } } },
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
      href: "/inventory/history",
      tone: row.type.startsWith("TRANSFER") ? "neutral" : row.difference < 0 ? "danger" : "success",
    }));
  const physical: DashboardActivity[] = counts.map(row => ({
    id: "count-" + row._id, amount: "INV", label: "Inventerad plats",
    locationCode: row.locationCode, createdAt: row.completedAt.toISOString(),
    href: "/inventories/" + row.inventorySessionId,
    tone: "neutral",
  }));
  return [...stock, ...physical].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
}
