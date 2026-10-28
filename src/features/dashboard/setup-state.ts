import "server-only";

import { InventoryLevel } from "@/models/inventory-level";
import { InventorySession } from "@/models/inventory-session";
import { Location } from "@/models/location";
import { Product } from "@/models/product";
import { Warehouse } from "@/models/warehouse";
import type { TenantContext } from "@/lib/server/tenant";

export type WarehouseSetupPhase =
  | "NO_WAREHOUSE"
  | "NO_LOCATIONS"
  | "NO_PRODUCTS"
  | "UNPLACED_PRODUCTS"
  | "READY_FOR_BASELINE"
  | "BASELINE_IN_PROGRESS"
  | "BASELINE_ESTABLISHED";

type PlacementSummary = {
  _id: null;
  productIds: string[];
  warehouseIds: string[];
  totalPositions: number;
};

type ActiveInventory = {
  _id: string;
  warehouseId: string;
  name: string;
  startedAt: Date;
  totalLocations: number;
  countedLocations: number;
};

export async function getWarehouseSetupState(
  context: TenantContext,
) {
  const organizationId = context.organizationId;
  const activeFilter = { organizationId, active: true };
  const [warehouses, locationCount, productCount, placementRows, completedRows, completedInventoryCount, activeRows] =
    await Promise.all([
      Warehouse.find(activeFilter).select("name").sort({ name: 1, _id: 1 }).lean(),
      Location.countDocuments(activeFilter),
      Product.countDocuments(activeFilter),
      InventoryLevel.aggregate<PlacementSummary>([
        { $match: { organizationId } },
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $match: {
            "product.organizationId": organizationId,
            "product.active": true,
          },
        },
        {
          $lookup: {
            from: "locations",
            localField: "locationId",
            foreignField: "_id",
            as: "location",
          },
        },
        { $unwind: "$location" },
        {
          $match: {
            "location.organizationId": organizationId,
            "location.active": true,
          },
        },
        {
          $lookup: {
            from: "warehouses",
            localField: "warehouseId",
            foreignField: "_id",
            as: "warehouse",
          },
        },
        { $unwind: "$warehouse" },
        {
          $match: {
            "warehouse.organizationId": organizationId,
            "warehouse.active": true,
          },
        },
        {
          $group: {
            _id: null,
            productIds: { $addToSet: { $toString: "$productId" } },
            warehouseIds: { $addToSet: { $toString: "$warehouseId" } },
            totalPositions: { $sum: 1 },
          },
        },
      ]),
      InventorySession.aggregate<{ _id: string; count: number }>([
        {
          $match: {
            organizationId,
            status: "completed",
            $or: [
              { establishesBaseline: true },
              { establishesBaseline: { $exists: false } },
            ],
          },
        },
        {
          $group: {
            _id: { $toString: "$warehouseId" },
            count: { $sum: 1 },
          },
        },
      ]),
      InventorySession.countDocuments({
        organizationId,
        status: "completed",
      }),
      InventorySession.aggregate<ActiveInventory>([
        {
          $match: {
            organizationId,
            status: "active",
            establishesBaseline: true,
          },
        },
        {
          $lookup: {
            from: "inventorySessionLocations",
            let: { inventoryId: "$_id" },
            pipeline: [
              {
                $match: {
                  organizationId,
                  $expr: { $eq: ["$inventorySessionId", "$$inventoryId"] },
                },
              },
            ],
            as: "places",
          },
        },
        {
          $project: {
            _id: { $toString: "$_id" },
            warehouseId: { $toString: "$warehouseId" },
            name: 1,
            startedAt: 1,
            totalLocations: { $size: "$places" },
            countedLocations: {
              $size: {
                $filter: {
                  input: "$places",
                  as: "place",
                  cond: { $eq: ["$$place.status", "counted"] },
                },
              },
            },
          },
        },
        { $sort: { startedAt: -1, _id: -1 } },
      ]),
    ]);

  const placement = placementRows[0];
  const placedProductCount = placement?.productIds.length ?? 0;
  const totalPositions = placement?.totalPositions ?? 0;
  const unplacedProductCount = Math.max(0, productCount - placedProductCount);
  const positionedWarehouseIds = new Set(placement?.warehouseIds ?? []);
  const relevantWarehouses = warehouses.filter((row) =>
    positionedWarehouseIds.has(String(row._id)),
  );
  const completedWarehouseIds = new Set(completedRows.map((row) => row._id));
  const verifiedWarehouses = relevantWarehouses.filter((row) =>
    completedWarehouseIds.has(String(row._id)),
  );
  const unverifiedWarehouses = relevantWarehouses.filter(
    (row) => !completedWarehouseIds.has(String(row._id)),
  );
  const activeInitialInventory = activeRows.find((row) =>
    unverifiedWarehouses.some(
      (warehouse) => String(warehouse._id) === row.warehouseId,
    ),
  );
  const targetWarehouse = activeInitialInventory
    ? warehouses.find(
        (warehouse) =>
          String(warehouse._id) === activeInitialInventory.warehouseId,
      )
    : unverifiedWarehouses[0];
  const baselineEstablished =
    relevantWarehouses.length > 0 &&
    verifiedWarehouses.length === relevantWarehouses.length;

  let phase: WarehouseSetupPhase;
  if (!warehouses.length) phase = "NO_WAREHOUSE";
  else if (!locationCount) phase = "NO_LOCATIONS";
  else if (baselineEstablished) phase = "BASELINE_ESTABLISHED";
  else if (!productCount) phase = "NO_PRODUCTS";
  else if (activeInitialInventory) phase = "BASELINE_IN_PROGRESS";
  else if (!totalPositions) phase = "UNPLACED_PRODUCTS";
  else phase = "READY_FOR_BASELINE";

  return {
    phase,
    baselineEstablished,
    warehouseCount: warehouses.length,
    locationCount,
    productCount,
    placedProductCount,
    unplacedProductCount,
    totalPositions,
    completedInventoryCount,
    baselineWarehouseCount: verifiedWarehouses.length,
    baselineWarehouseTotal: relevantWarehouses.length,
    targetWarehouse: targetWarehouse
      ? { id: String(targetWarehouse._id), name: targetWarehouse.name }
      : null,
    activeInitialInventory: activeInitialInventory
      ? {
          id: activeInitialInventory._id,
          name: activeInitialInventory.name,
          warehouseId: activeInitialInventory.warehouseId,
          countedLocations: activeInitialInventory.countedLocations,
          totalLocations: activeInitialInventory.totalLocations,
        }
      : null,
  };
}

export type WarehouseSetupState = Awaited<
  ReturnType<typeof getWarehouseSetupState>
>;
