import "server-only";
import { z } from "zod";
import { connectDb } from "@/lib/server/db";
import { AppError } from "@/lib/server/errors";
import type { TenantContext } from "@/lib/server/tenant";
import { InventorySession } from "@/models/inventory-session";
import { InventorySessionLocation } from "@/models/inventory-session-location";
import { InventoryCount } from "@/models/inventory-count";
import { InventoryLevel } from "@/models/inventory-level";
import { Product } from "@/models/product";
import { Warehouse } from "@/models/warehouse";
import { objectIdSchema } from "@/validation/organization";

export async function listInventories(context: TenantContext, input: unknown = 1) {
  const requested = z.coerce.number().int().min(1).max(100000).parse(input);
  const filter = { organizationId: context.organizationId };
  const total = await InventorySession.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / 20)), page = Math.min(requested, pages);
  const records = await InventorySession.find(filter).sort({ startedAt: -1, _id: -1 }).skip((page - 1) * 20).limit(20).lean();
  const scopes = await InventorySessionLocation.find({ ...filter, inventorySessionId: { $in: records.map(row => row._id) } }).lean();
  return { page, pages, items: records.map(row => {
    const places = scopes.filter(scope => scope.inventorySessionId.equals(row._id));
    return { id: String(row._id), name: row.name, warehouseName: row.warehouseName, status: row.status,
      total: places.length, counted: places.filter(scope => scope.status === "counted").length,
      startedAt: row.startedAt.toISOString() };
  }) };
}

export async function getInventory(context: TenantContext, id: string) {
  objectIdSchema.parse(id);
  const db = await connectDb();
  // A consistent snapshot keeps the displayed review revision tied to its counts.
  return db.connection.transaction(async session => {
    const filter = { organizationId: context.organizationId, inventorySessionId: id };
    const inventory = await InventorySession.findOne({ _id: id, organizationId: context.organizationId }).session(session).lean();
    if (!inventory || !await Warehouse.exists({ _id: inventory.warehouseId, organizationId: context.organizationId }).session(session)) {
      throw new AppError(404, "INVENTORY_NOT_FOUND", "Inventeringen kunde inte hittas.");
    }
    const scopes = await InventorySessionLocation.find(filter).session(session).lean();
    const counts = await InventoryCount.find(filter).session(session).lean();
    const levels = await InventoryLevel.find({ organizationId: context.organizationId, warehouseId: inventory.warehouseId,
      locationId: { $in: scopes.map(row => row.locationId) } }).session(session).lean();
    const products = await Product.find({ organizationId: context.organizationId,
      _id: { $in: [...levels.map(row => row.productId), ...counts.map(row => row.productId)] } }).session(session).lean();
    const productMap = new Map(products.map(row => [String(row._id), row]));
    const places = scopes.map(scope => {
      const saved = counts.filter(row => row.locationId.equals(scope.locationId));
      const current = levels.filter(row => row.locationId.equals(scope.locationId) && productMap.get(String(row.productId))?.active);
      const ids = inventory.status === "completed" ? saved.map(row => String(row.productId))
        : [...new Set([...saved.map(row => String(row.productId)), ...current.map(row => String(row.productId))])];
      const rows = ids.map(productId => {
        const count = saved.find(row => String(row.productId) === productId);
        const level = current.find(row => String(row.productId) === productId);
        const product = productMap.get(productId);
        return { productId, productName: count?.productName ?? product?.name ?? "Produkt",
          sku: count?.sku ?? product?.sku ?? "", expectedQuantity: count?.expectedQuantity ?? level?.quantity ?? 0,
          expectedVersion: count?.expectedVersion ?? null, currentQuantity: level?.quantity ?? 0, currentVersion: level?.version ?? null,
          countedQuantity: count?.countedQuantity ?? null, difference: count?.difference ?? null,
          countedByName: count?.countedByName ?? null, countedAt: count?.countedAt.toISOString() ?? null,
          stale: inventory.status === "active" && scope.status === "counted" &&
            (!count || (level?.version ?? null) !== count.expectedVersion || !product?.active) };
      }).sort((a, b) => a.productName.localeCompare(b.productName, "sv"));
      return { id: String(scope.locationId), code: scope.locationCode, status: scope.status, revision: scope.revision,
        completedByName: scope.completedByName ?? null, completedAt: scope.completedAt?.toISOString() ?? null,
        stale: rows.some(row => row.stale), rows };
    }).sort((a, b) => a.code.localeCompare(b.code, "sv", { numeric: true }));
    return { id: String(inventory._id), name: inventory.name, warehouseName: inventory.warehouseName,
      warehouseId: String(inventory.warehouseId), status: inventory.status, revision: inventory.revision,
      startedAt: inventory.startedAt.toISOString(), completedAt: inventory.completedAt?.toISOString() ?? null,
      counted: places.filter(row => row.status === "counted").length, places,
      discrepancies: places.flatMap(place => place.rows.filter(row => row.difference !== null && row.difference !== 0)
        .map(row => ({ ...row, locationId: place.id, locationCode: place.code }))) };
  });
}
export type InventoryDetail = Awaited<ReturnType<typeof getInventory>>;
export type InventoryPlace = InventoryDetail["places"][number];
