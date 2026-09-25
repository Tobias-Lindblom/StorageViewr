import "server-only";
import { Warehouse } from "@/models/warehouse";
import { Location } from "@/models/location";
import { Product } from "@/models/product";
import { InventorySession } from "@/models/inventory-session";
import { InventorySessionLocation } from "@/models/inventory-session-location";
import type { TenantContext } from "@/lib/server/tenant";

export async function getDashboard(context: TenantContext) {
  const filter = { organizationId: context.organizationId, active: true };
  const inventoryFilter = {
    organizationId: context.organizationId,
    status: "active" as const,
  };
  const [
    warehouseCount,
    locationCount,
    productCount,
    activeInventoryCount,
    inventoryRecords,
  ] = await Promise.all([
    Warehouse.countDocuments(filter),
    Location.countDocuments(filter),
    Product.countDocuments(filter),
    InventorySession.countDocuments(inventoryFilter),
    InventorySession.find(inventoryFilter)
      .sort({ startedAt: -1, _id: -1 })
      .limit(3)
      .lean(),
  ]);
  const scopes = inventoryRecords.length
    ? await InventorySessionLocation.find({
        organizationId: context.organizationId,
        inventorySessionId: { $in: inventoryRecords.map((row) => row._id) },
      }).lean()
    : [];
  return {
    warehouseCount,
    locationCount,
    productCount,
    activeInventoryCount,
    activeInventories: inventoryRecords.map((inventory) => {
      const places = scopes.filter((scope) =>
        scope.inventorySessionId.equals(inventory._id),
      );
      return {
        id: String(inventory._id),
        name: inventory.name,
        warehouseName: inventory.warehouseName,
        counted: places.filter((place) => place.status === "counted").length,
        total: places.length,
      };
    }),
  };
}
