import "server-only";
import { Types, type ClientSession } from "mongoose";
import { connectDb } from "@/lib/server/db";
import { AppError } from "@/lib/server/errors";
import { requireAdmin, type TenantContext } from "@/lib/server/tenant";
import { InventorySession } from "@/models/inventory-session";
import { InventorySessionLocation } from "@/models/inventory-session-location";
import { InventoryCount } from "@/models/inventory-count";
import { InventoryLevel } from "@/models/inventory-level";
import { InventoryMovement } from "@/models/inventory-movement";
import { Warehouse } from "@/models/warehouse";
import { Location } from "@/models/location";
import { Product } from "@/models/product";
import { User } from "@/models/user";
import { objectIdSchema } from "@/validation/organization";
import { startInventorySchema, saveCountSchema, finishInventorySchema } from "@/validation/inventory-session";

function conflict(message = "Saldot eller räkningen har ändrats. Läs in platsen igen och bekräfta din räkning."): never {
  throw new AppError(409, "INVENTORY_CONFLICT", message);
}
async function lockWarehouse(context: TenantContext, id: string | Types.ObjectId, session: ClientSession) {
  const warehouse = await Warehouse.findOneAndUpdate({ _id: id, organizationId: context.organizationId, active: true },
    { $inc: { locationRevision: 1 } }, { session, returnDocument: "after" });
  if (!warehouse) throw new AppError(404, "WAREHOUSE_NOT_FOUND", "Välj ett aktivt lager i ditt företag.");
  return warehouse;
}
async function lockInventory(context: TenantContext, id: string, session: ClientSession) {
  const filter = { _id: objectIdSchema.parse(id), organizationId: context.organizationId };
  const inventory = await InventorySession.findOne(filter).session(session);
  if (!inventory) throw new AppError(404, "INVENTORY_NOT_FOUND", "Inventeringen kunde inte hittas.");
  if (inventory.status === "completed") return inventory;
  await lockWarehouse(context, inventory.warehouseId, session);
  // The warehouse lock serializes counts/completion with all stock writes.
  return (await InventorySession.findOneAndUpdate(filter, { $inc: { revision: 1 } }, { session, returnDocument: "before" }))!;
}
async function currentRows(context: TenantContext, locationIds: Types.ObjectId[], session: ClientSession) {
  const levels = await InventoryLevel.find({ organizationId: context.organizationId, locationId: { $in: locationIds } }).session(session).lean();
  const products = await Product.find({ organizationId: context.organizationId, _id: { $in: levels.map(row => row.productId) }, active: true }).session(session).lean();
  const active = new Set(products.map(row => String(row._id)));
  return levels.filter(row => active.has(String(row.productId)));
}

export async function startInventory(context: TenantContext, input: unknown) {
  requireAdmin(context);
  const data = startInventorySchema.parse(input);
  const db = await connectDb();
  return db.connection.transaction(async session => {
    const warehouse = await lockWarehouse(context, data.warehouseId, session);
    const locations = await Location.find({ organizationId: context.organizationId, warehouseId: warehouse._id,
      _id: { $in: data.locationIds }, active: true }).session(session);
    if (locations.length !== data.locationIds.length) throw new AppError(400, "INVALID_SCOPE", "Alla valda platser måste vara aktiva och tillhöra det valda lagret.");
    await Location.updateMany({ organizationId: context.organizationId, _id: { $in: data.locationIds } }, { $inc: { stockRevision: 1 } }, { session });
    const levels = await currentRows(context, locations.map(row => row._id), session);
    // Share product locks with deactivation, including zero balances.
    await Product.updateMany({ organizationId: context.organizationId, _id: { $in: levels.map(row => row.productId) } }, { $inc: { stockRevision: 1 } }, { session });
    const [inventory] = await InventorySession.create([{ organizationId: context.organizationId, warehouseId: warehouse._id,
      warehouseName: warehouse.name, name: data.name, startedBy: context.userId }], { session });
    await InventorySessionLocation.insertMany(locations.map(location => ({
      organizationId: context.organizationId, inventorySessionId: inventory._id, locationId: location._id, locationCode: location.code,
    })), { session });
    return { id: String(inventory._id) };
  });
}

export async function saveLocationCount(context: TenantContext, id: string, locationId: string, input: unknown) {
  const data = saveCountSchema.parse(input);
  objectIdSchema.parse(locationId);
  const db = await connectDb();
  return db.connection.transaction(async session => {
    const inventory = await lockInventory(context, id, session);
    if (inventory.status !== "active") conflict("Inventeringen är avslutad och kan inte ändras.");
    const scopeFilter = { organizationId: context.organizationId, inventorySessionId: inventory._id, locationId };
    const scope = await InventorySessionLocation.findOne(scopeFilter).session(session);
    if (!scope) throw new AppError(404, "LOCATION_NOT_IN_SCOPE", "Platsen ingår inte i inventeringen.");
    if (scope.revision !== data.expectedRevision) conflict();
    if (scope.status === "counted" && !data.confirmReplace) conflict("Bekräfta att den tidigare räkningen ska ersättas.");
    const location = await Location.findOneAndUpdate({ _id: locationId, organizationId: context.organizationId, warehouseId: inventory.warehouseId, active: true },
      { $inc: { stockRevision: 1 } }, { session, returnDocument: "after" });
    if (!location) conflict("Lagerplatsen är inte längre aktiv.");
    const products = await Product.find({ organizationId: context.organizationId, _id: { $in: data.rows.map(row => row.productId) }, active: true }).session(session).lean();
    if (products.length !== data.rows.length) throw new AppError(400, "INVALID_PRODUCT", "Välj aktiva produkter i ditt företag.");
    await Product.updateMany({ organizationId: context.organizationId, _id: { $in: products.map(row => row._id) } },
      { $inc: { stockRevision: 1 } }, { session });
    const levels = await currentRows(context, [location._id], session);
    const submitted = new Map(data.rows.map(row => [row.productId, row]));
    if (levels.some(row => !submitted.has(String(row.productId)))) conflict("Platsens produkter har ändrats eller saknas i räkningen. Läs in platsen igen.");
    const levelMap = new Map(levels.map(row => [String(row.productId), row]));
    const productMap = new Map(products.map(row => [String(row._id), row]));
    const actor = await User.findById(context.userId).select("name").session(session).lean();
    const counts = data.rows.map(row => {
      const level = levelMap.get(row.productId);
      if ((level?.version ?? null) !== row.expectedVersion) conflict();
      const product = productMap.get(row.productId)!;
      return { ...scopeFilter, productId: product._id, productName: product.name, sku: product.sku,
        expectedQuantity: level?.quantity ?? 0, expectedVersion: level?.version ?? null,
        countedQuantity: row.countedQuantity, difference: row.countedQuantity - (level?.quantity ?? 0),
        countedBy: context.userId, countedByName: actor?.name ?? "Användare", countedAt: new Date() };
    });
    // Replace whole immutable snapshots only after explicit recount confirmation.
    await InventoryCount.deleteMany(scopeFilter, { session });
    if (counts.length) await InventoryCount.insertMany(counts, { session });
    await InventorySessionLocation.updateOne(scopeFilter, { $set: { status: "counted", completedBy: context.userId,
      completedByName: actor?.name ?? "Användare", completedAt: new Date() }, $inc: { revision: 1 } }, { session });
    return { saved: true };
  });
}

export async function finishInventory(context: TenantContext, id: string, input: unknown) {
  requireAdmin(context);
  const data = finishInventorySchema.parse(input);
  const db = await connectDb();
  return db.connection.transaction(async session => {
    const inventory = await lockInventory(context, id, session);
    if (inventory.status === "completed") return { id: String(inventory._id), status: "completed" };
    if (inventory.revision !== data.expectedRevision) conflict("Räkningarna har ändrats sedan granskningen. Läs in inventeringen igen.");
    const filter = { organizationId: context.organizationId, inventorySessionId: inventory._id };
    const scopes = await InventorySessionLocation.find(filter).session(session).lean();
    if (!scopes.length || scopes.some(row => row.status !== "counted")) conflict("Alla lagerplatser måste räknas och bekräftas före avslut.");
    const counts = await InventoryCount.find(filter).session(session).lean();
    const locations = await Location.find({ organizationId: context.organizationId, warehouseId: inventory.warehouseId,
      _id: { $in: scopes.map(row => row.locationId) }, active: true }).session(session).lean();
    if (locations.length !== scopes.length) conflict("En lagerplats är inte längre aktiv.");
    const levels = await currentRows(context, locations.map(row => row._id), session);
    const key = (product: unknown, location: unknown) => String(product) + ":" + String(location);
    const countMap = new Map(counts.map(row => [key(row.productId, row.locationId), row]));
    if (levels.some(row => !countMap.has(key(row.productId, row.locationId)))) conflict("Nya produkter har tillkommit på en räknad plats. Räkna platsen igen.");
    const levelMap = new Map(levels.map(row => [key(row.productId, row.locationId), row]));
    // Validate every version before writing a single adjustment.
    for (const count of counts) {
      if (!locations.some(location => location._id.equals(count.locationId))) conflict();
      if ((levelMap.get(key(count.productId, count.locationId))?.version ?? null) !== count.expectedVersion) conflict("Saldon har ändrats sedan räkningen. Räkna om de markerade platserna före avslut.");
    }
    const products = await Product.find({ organizationId: context.organizationId, _id: { $in: counts.map(row => row.productId) }, active: true }).session(session).lean();
    const productMap = new Map(products.map(row => [String(row._id), row]));
    if (counts.some(row => !productMap.has(String(row.productId)))) conflict("En räknad produkt är inte längre aktiv.");
    await Location.updateMany({ organizationId: context.organizationId, _id: { $in: locations.map(row => row._id) } }, { $inc: { stockRevision: 1 } }, { session });
    await Product.updateMany({ organizationId: context.organizationId, _id: { $in: products.map(row => row._id) } }, { $inc: { stockRevision: 1 } }, { session });
    const actor = await User.findById(context.userId).select("name").session(session).lean();
    for (const count of counts) {
      if (count.difference === 0) continue;
      const level = levelMap.get(key(count.productId, count.locationId));
      const pair = { organizationId: context.organizationId, productId: count.productId, locationId: count.locationId };
      if (level) {
        if (level.version >= Number.MAX_SAFE_INTEGER) conflict("Saldots versionsgräns har uppnåtts.");
        const updated = await InventoryLevel.updateOne({ ...pair, version: count.expectedVersion },
          { $set: { quantity: count.countedQuantity }, $inc: { version: 1 } }, { session, runValidators: true });
        if (!updated.matchedCount) conflict();
      } else {
        await InventoryLevel.create([{ ...pair, warehouseId: inventory.warehouseId, quantity: count.countedQuantity, version: 1 }], { session });
      }
      await InventoryMovement.create([{ ...pair, warehouseId: inventory.warehouseId, inventorySessionId: inventory._id,
        type: "INVENTORY", previousQuantity: count.expectedQuantity, newQuantity: count.countedQuantity, difference: count.difference,
        performedBy: context.userId, performedByName: actor?.name ?? "Användare",
        productName: count.productName, sku: count.sku, locationCode: scopes.find(row => row.locationId.equals(count.locationId))!.locationCode,
        warehouseName: inventory.warehouseName, reason: "Inventering: " + inventory.name }], { session });
    }
    await InventorySession.updateOne({ _id: inventory._id, organizationId: context.organizationId },
      { $set: { status: "completed", completedAt: new Date(), completedBy: context.userId } }, { session });
    return { id: String(inventory._id), status: "completed" };
  });
}
