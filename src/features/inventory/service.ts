import "server-only";
import { InventoryLevel } from "@/models/inventory-level";
import { InventoryMovement } from "@/models/inventory-movement";
import { Product } from "@/models/product";
import { Location } from "@/models/location";
import { Warehouse } from "@/models/warehouse";
import { User } from "@/models/user";
import { connectDb } from "@/lib/server/db";
import { AppError, isDuplicateKey } from "@/lib/server/errors";
import { requireAdmin, type TenantContext } from "@/lib/server/tenant";
import { stockScopeSchema, stockPairSchema, stockAdjustmentSchema, historyQuerySchema } from "@/validation/inventory";

async function checkScope(context: TenantContext, scope: { productId?: string; locationId?: string }) {
  const active = context.role === "admin" ? {} : { active: true };
  if (scope.productId && !(await Product.exists({ _id: scope.productId, organizationId: context.organizationId, ...active }))) {
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Produkten kunde inte hittas.");
  }
  if (scope.locationId) {
    const location = await Location.findOne({ _id: scope.locationId, organizationId: context.organizationId, ...active }).lean();
    if (!location || !(await Warehouse.exists({ _id: location.warehouseId, organizationId: context.organizationId, ...active }))) {
      throw new AppError(404, "LOCATION_NOT_FOUND", "Lagerplatsen kunde inte hittas.");
    }
  }
}
export async function getStockPair(context: TenantContext, input: unknown) {
  const pair = stockPairSchema.parse(input);
  await checkScope(context, pair);
  const record = await InventoryLevel.findOne({ ...pair, organizationId: context.organizationId }).lean();
  return { productId: pair.productId, locationId: pair.locationId, quantity: record?.quantity ?? 0, version: record?.version ?? null };
}
export async function listStock(context: TenantContext, input: unknown) {
  const scope = stockScopeSchema.parse(input);
  await checkScope(context, scope);
  const records = await InventoryLevel.find({ ...scope, organizationId: context.organizationId }).sort({ _id: 1 }).lean();
  const active = context.role === "admin" ? {} : { active: true };
  const [products, locations, warehouses] = await Promise.all([
    Product.find({ organizationId: context.organizationId, _id: { $in: records.map(row => row.productId) }, ...active }).lean(),
    Location.find({ organizationId: context.organizationId, _id: { $in: records.map(row => row.locationId) }, ...active }).lean(),
    Warehouse.find({ organizationId: context.organizationId, _id: { $in: records.map(row => row.warehouseId) }, ...active }).lean(),
  ]);
  const productMap = new Map(products.map(row => [String(row._id), row]));
  const locationMap = new Map(locations.map(row => [String(row._id), row]));
  const warehouseMap = new Map(warehouses.map(row => [String(row._id), row]));
  const items = records.flatMap(row => {
    const product = productMap.get(String(row.productId)), location = locationMap.get(String(row.locationId)), warehouse = warehouseMap.get(String(row.warehouseId));
    if (!product || !location || !warehouse || !location.warehouseId.equals(row.warehouseId)) return [];
    return [{ id: String(row._id), productId: String(row.productId), locationId: String(row.locationId),
      productName: product.name, sku: product.sku, locationCode: location.code, warehouseName: warehouse.name,
      quantity: row.quantity, version: row.version, active: product.active && location.active && warehouse.active }];
  }).sort((a, b) => (scope.productId ? a.warehouseName.localeCompare(b.warehouseName, "sv") || a.locationCode.localeCompare(b.locationCode, "sv", { numeric: true }) : a.productName.localeCompare(b.productName, "sv")));
  return { items, total: items.reduce((sum, row) => sum + BigInt(row.quantity), BigInt(0)).toString() };
}
function stale(): never {
  throw new AppError(409, "STOCK_CONFLICT", "Saldot har ändrats av någon annan. Läs in aktuellt saldo och kontrollera ditt nya antal innan du sparar igen.");
}
export async function adjustStock(context: TenantContext, input: unknown) {
  requireAdmin(context);
  const data = stockAdjustmentSchema.parse(input);
  const db = await connectDb();
  try {
    return await db.connection.transaction(async session => {
      const location = await Location.findOne({ _id: data.locationId, organizationId: context.organizationId, active: true }).session(session);
      if (!location) throw new AppError(404, "LOCATION_NOT_FOUND", "Välj en aktiv lagerplats i ditt företag.");
      // Acquire the same parent locks used by deactivation, in a consistent order.
      const warehouse = await Warehouse.findOneAndUpdate({ _id: location.warehouseId, organizationId: context.organizationId, active: true },
        { $inc: { locationRevision: 1 } }, { session, returnDocument: "after" });
      if (!warehouse) throw new AppError(409, "WAREHOUSE_INACTIVE", "Lagret är inte aktivt.");
      await Location.updateOne({ _id: location._id, organizationId: context.organizationId }, { $inc: { stockRevision: 1 } }, { session });
      const product = await Product.findOneAndUpdate({ _id: data.productId, organizationId: context.organizationId, active: true },
        { $inc: { stockRevision: 1 } }, { session, returnDocument: "after" });
      if (!product) throw new AppError(404, "PRODUCT_NOT_FOUND", "Välj en aktiv produkt i ditt företag.");
      const filter = { organizationId: context.organizationId, productId: product._id, locationId: location._id };
      const current = await InventoryLevel.findOne(filter).session(session);
      if ((current?.version ?? null) !== data.expectedVersion) stale();
      if (current && current.quantity === data.quantity) throw new AppError(400, "STOCK_UNCHANGED", "Ange ett annat antal än det nuvarande saldot.");
      if (current && current.version >= Number.MAX_SAFE_INTEGER) throw new AppError(409, "VERSION_LIMIT", "Saldot kan inte ändras fler gånger.");
      const previousQuantity = current?.quantity ?? 0;
      let record;
      if (current) {
        record = await InventoryLevel.findOneAndUpdate({ ...filter, version: data.expectedVersion },
          { $set: { quantity: data.quantity }, $inc: { version: 1 } }, { session, returnDocument: "after", runValidators: true });
        if (!record) stale();
      } else {
        [record] = await InventoryLevel.create([{ ...filter, warehouseId: warehouse._id, quantity: data.quantity, version: 1 }], { session });
      }
      const actor = await User.findOne({ _id: context.userId }).select("name").session(session).lean();
      await InventoryMovement.create([{
        organizationId: context.organizationId, warehouseId: warehouse._id, productId: product._id, locationId: location._id,
        type: current ? "ADJUSTMENT" : "INITIAL", previousQuantity, newQuantity: data.quantity,
        difference: data.quantity - previousQuantity, performedBy: context.userId, performedByName: actor?.name ?? "Användare",
        productName: product.name, sku: product.sku, locationCode: location.code, warehouseName: warehouse.name, reason: data.reason,
      }], { session });
      return { productId: String(product._id), locationId: String(location._id), quantity: record.quantity, version: record.version };
    });
  } catch (error) {
    if (isDuplicateKey(error)) stale();
    throw error;
  }
}
export async function listMovements(context: TenantContext, input: unknown) {
  requireAdmin(context);
  const { page: requestedPage, ...scope } = historyQuerySchema.parse(input);
  await checkScope(context, scope);
  const filter = { organizationId: context.organizationId, ...scope };
  const total = await InventoryMovement.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / 20)), page = Math.min(requestedPage, pages);
  const records = await InventoryMovement.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(20).lean();
  return { page, pages, total, items: records.map(row => ({
    id: String(row._id), type: row.type, inventorySessionId: row.inventorySessionId ? String(row.inventorySessionId) : null, previousQuantity: row.previousQuantity, newQuantity: row.newQuantity,
    difference: row.difference, reason: row.reason, productName: row.productName, sku: row.sku,
    locationCode: row.locationCode, warehouseName: row.warehouseName,
    performedByName: row.performedByName, createdAt: row.createdAt.toISOString(),
  })) };
}
export type StockData = Awaited<ReturnType<typeof listStock>>;
export type StockPair = Awaited<ReturnType<typeof getStockPair>>;
export type MovementData = Awaited<ReturnType<typeof listMovements>>;
