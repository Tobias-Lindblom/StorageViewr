import "server-only";
import { getDashboardInsights } from "./insights";
import { getDashboardActivity } from "./activity";
import { Warehouse } from "@/models/warehouse";
import { Location } from "@/models/location";
import { Product } from "@/models/product";
import { InventorySession } from "@/models/inventory-session";
import { InventorySessionLocation } from "@/models/inventory-session-location";
import type { TenantContext } from "@/lib/server/tenant";
import { productStockStages } from "@/features/products/product-stock";
import { legacyOreToSek, sekToUnits } from "@/lib/money";

export async function getDashboard(context: TenantContext) {
  const filter = { organizationId: context.organizationId, active: true };
  const inventoryFilter = {
    organizationId: context.organizationId,
    status: "active" as const,
  };
  const [
    warehouseCount,
    locationCount,
    productStock,
    inventoryRecords,
    insights,
    activity,
  ] = await Promise.all([
    Warehouse.countDocuments(filter),
    Location.countDocuments(filter),
    Product.aggregate<{
      unitValue?: string | null;
      unitValueOre?: number | null;
      totalQuantity: string;
    }>([
      { $match: filter },
      ...productStockStages(context),
      { $project: {
        unitValue: 1,
        unitValueOre: 1,
        totalQuantity: { $toString: "$stockTotal" },
      } },
    ]),
    InventorySession.find(inventoryFilter)
      .sort({ startedAt: -1, _id: -1 })
      .limit(3)
      .lean(),
    getDashboardInsights(context),
    getDashboardActivity(context),
  ]);
  const scopes = inventoryRecords.length
    ? await InventorySessionLocation.find({
        organizationId: context.organizationId,
        inventorySessionId: { $in: inventoryRecords.map((row) => row._id) },
      }).lean()
    : [];
  const stockUnitCount = productStock.reduce(
    (sum, row) => sum + BigInt(row.totalQuantity),
    BigInt(0),
  );
  const inventoryValueUnits = productStock.reduce((sum, row) => {
    const unitValue = row.unitValue !== undefined
      ? row.unitValue
      : legacyOreToSek(row.unitValueOre ?? null);
    return unitValue === null
      ? sum
      : sum + BigInt(row.totalQuantity) * sekToUnits(unitValue);
  }, BigInt(0));
  const productsWithoutValue = productStock.filter(row =>
    (row.unitValue !== undefined ? row.unitValue : legacyOreToSek(row.unitValueOre ?? null)) === null,
  ).length;
  return {
    insights,
    activity,
    warehouseCount,
    locationCount,
    productCount: productStock.length,
    stockUnitCount: stockUnitCount.toString(),
    inventoryValueUnits: inventoryValueUnits.toString(),
    productsWithoutValue,
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
