import "server-only";

import { Types } from "mongoose";
import { connectDb } from "@/lib/server/db";
import { AppError } from "@/lib/server/errors";
import { requireAdmin, type TenantContext } from "@/lib/server/tenant";
import { legacyOreToSek, sekToUnits } from "@/lib/money";
import { InventoryDiscrepancy } from "@/models/inventory-discrepancy";
import { InventoryLevel } from "@/models/inventory-level";
import { InventoryMovement } from "@/models/inventory-movement";
import { InventorySession } from "@/models/inventory-session";
import { Location } from "@/models/location";
import { Product } from "@/models/product";
import { User } from "@/models/user";
import { Warehouse } from "@/models/warehouse";
import { objectIdSchema } from "@/validation/organization";
import { discrepancyActionSchema } from "@/validation/discrepancy";

export type DiscrepancyStatus = "OPEN" | "RESOLVED" | "RECOUNTED";

export async function listDiscrepancies(
  context: TenantContext,
  options: { status?: DiscrepancyStatus | "ALL"; limit?: number } = {},
) {
  requireAdmin(context);
  const status = options.status ?? "OPEN";
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 2000);
  const rows = await InventoryDiscrepancy.find({
    organizationId: context.organizationId,
    ...(status === "ALL" ? {} : { status }),
  }).sort({ createdAt: -1, _id: -1 }).limit(limit).lean();
  const [products, locations, sessions] = await Promise.all([
    Product.find({ organizationId: context.organizationId, _id: { $in: rows.map(row => row.productId) } })
      .select("name sku unitValue unitValueOre").lean(),
    Location.find({ organizationId: context.organizationId, _id: { $in: rows.map(row => row.locationId) } })
      .select("code warehouseId").lean(),
    InventorySession.find({ organizationId: context.organizationId, _id: { $in: rows.map(row => row.inventorySessionId) } })
      .select("name warehouseName completedAt").lean(),
  ]);
  const warehouses = await Warehouse.find({
    organizationId: context.organizationId,
    _id: { $in: locations.map(row => row.warehouseId) },
  }).select("name").lean();
  const productMap = new Map(products.map(row => [String(row._id), row]));
  const locationMap = new Map(locations.map(row => [String(row._id), row]));
  const sessionMap = new Map(sessions.map(row => [String(row._id), row]));
  const warehouseMap = new Map(warehouses.map(row => [String(row._id), row.name]));
  return rows.map(row => {
    const product = productMap.get(String(row.productId));
    const location = locationMap.get(String(row.locationId));
    const inventory = sessionMap.get(String(row.inventorySessionId));
    const unitValue = row.unitValue !== undefined
      ? row.unitValue
      : product ? product.unitValue !== undefined ? product.unitValue : legacyOreToSek(product.unitValueOre ?? null) : null;
    return {
      id: String(row._id),
      inventorySessionId: String(row.inventorySessionId),
      inventoryName: inventory?.name ?? "Inventering",
      productId: String(row.productId),
      productName: row.productName ?? product?.name ?? "Borttagen produkt",
      sku: row.sku ?? product?.sku ?? "–",
      locationId: String(row.locationId),
      locationCode: row.locationCode ?? location?.code ?? "Borttagen lagerplats",
      warehouseName: row.warehouseName ?? (location ? warehouseMap.get(String(location.warehouseId)) ?? inventory?.warehouseName ?? "Lager" : inventory?.warehouseName ?? "Lager"),
      expectedQuantity: row.expectedQuantity,
      countedQuantity: row.countedQuantity,
      difference: row.difference,
      unitValue,
      valueDifferenceUnits: unitValue === null ? null : (BigInt(row.difference) * sekToUnits(unitValue)).toString(),
      status: row.status as DiscrepancyStatus,
      comment: row.comment ?? row.resolutionNote ?? "",
      createdAt: row.createdAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
    };
  });
}

export async function updateDiscrepancy(context: TenantContext, id: string, input: unknown) {
  requireAdmin(context);
  const discrepancyId = objectIdSchema.parse(id);
  const data = discrepancyActionSchema.parse(input);
  const db = await connectDb();
  return db.connection.transaction(async session => {
    const discrepancy = await InventoryDiscrepancy.findOne({
      _id: discrepancyId,
      organizationId: context.organizationId,
      status: "OPEN",
    }).session(session);
    if (!discrepancy) throw new AppError(404, "DISCREPANCY_NOT_FOUND", "Den öppna avvikelsen kunde inte hittas.");

    if (data.action === "INVESTIGATE") {
      discrepancy.comment = data.comment;
      await discrepancy.save({ session });
      return { id, status: "OPEN" as const };
    }

    const resolvedAt = new Date();
    if (data.action === "RESOLVE") {
      discrepancy.status = "RESOLVED";
      discrepancy.resolution = "DISMISSED";
      discrepancy.resolvedAt = resolvedAt;
      discrepancy.resolvedBy = new Types.ObjectId(context.userId);
      discrepancy.resolutionNote = data.comment;
      discrepancy.comment = data.comment;
      await discrepancy.save({ session });
      return { id, status: "RESOLVED" as const };
    }

    const location = await Location.findOne({ _id: discrepancy.locationId, organizationId: context.organizationId, active: true }).session(session);
    const product = await Product.findOne({ _id: discrepancy.productId, organizationId: context.organizationId, active: true }).session(session);
    if (!location || !product) throw new AppError(409, "DISCREPANCY_SCOPE_CHANGED", "Produkten eller lagerplatsen är inte längre aktiv. Räkna om platsen.");
    const warehouse = await Warehouse.findOneAndUpdate(
      { _id: location.warehouseId, organizationId: context.organizationId, active: true },
      { $inc: { locationRevision: 1 } }, { session, returnDocument: "after" },
    );
    if (!warehouse) throw new AppError(409, "WAREHOUSE_INACTIVE", "Lagret är inte längre aktivt.");
    await Location.updateOne({ _id: location._id, organizationId: context.organizationId }, { $inc: { stockRevision: 1 } }, { session });
    await Product.updateOne({ _id: product._id, organizationId: context.organizationId }, { $inc: { stockRevision: 1 } }, { session });
    const level = await InventoryLevel.findOne({
      organizationId: context.organizationId,
      productId: product._id,
      locationId: location._id,
    }).session(session);
    const registered = level?.quantity ?? 0;
    if (registered !== discrepancy.expectedQuantity)
      throw new AppError(409, "DISCREPANCY_STALE", "Det registrerade saldot har ändrats. Räkna om lagerplatsen innan avvikelsen godkänns.");
    if (level) {
      await InventoryLevel.updateOne({ _id: level._id, version: level.version }, {
        $set: { quantity: discrepancy.countedQuantity }, $inc: { version: 1 },
      }, { session, runValidators: true });
    } else {
      await InventoryLevel.create([{
        organizationId: context.organizationId, warehouseId: warehouse._id,
        productId: product._id, locationId: location._id,
        quantity: discrepancy.countedQuantity, version: 1,
      }], { session });
    }
    const actor = await User.findOne({ _id: context.userId }).select("name").session(session).lean();
    await InventoryMovement.create([{
      organizationId: context.organizationId, warehouseId: warehouse._id,
      productId: product._id, locationId: location._id,
      inventorySessionId: discrepancy.inventorySessionId,
      type: "INVENTORY", previousQuantity: registered,
      newQuantity: discrepancy.countedQuantity,
      difference: discrepancy.countedQuantity - registered,
      performedBy: context.userId, performedByName: actor?.name ?? "Användare",
      productName: product.name, sku: product.sku,
      locationCode: location.code, warehouseName: warehouse.name,
      reason: "Godkänd inventeringsavvikelse",
    }], { session });
    discrepancy.status = "RESOLVED";
    discrepancy.resolution = "APPROVED";
    discrepancy.resolvedAt = resolvedAt;
    discrepancy.resolvedBy = new Types.ObjectId(context.userId);
    discrepancy.resolutionNote = data.comment || "Räknat saldo godkändes.";
    discrepancy.comment = data.comment;
    await discrepancy.save({ session });
    return { id, status: "RESOLVED" as const };
  });
}

export type DiscrepancyRow = Awaited<ReturnType<typeof listDiscrepancies>>[number];
