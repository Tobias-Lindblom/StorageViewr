import "server-only";
import { Types } from "mongoose";
import { historyMovementTypes, historySearch } from "./history-query";
import { InventoryLevel } from "@/models/inventory-level";
import { InventoryMovement } from "@/models/inventory-movement";
import { Product } from "@/models/product";
import { Location } from "@/models/location";
import { Warehouse } from "@/models/warehouse";
import { User } from "@/models/user";
import { connectDb } from "@/lib/server/db";
import { AppError, isDuplicateKey } from "@/lib/server/errors";
import { requireAdmin, type TenantContext } from "@/lib/server/tenant";
import {
  stockScopeSchema,
  stockPairSchema,
  stockMovementSchema,
  historyQuerySchema,
} from "@/validation/inventory";

export async function checkScope(
  context: TenantContext,
  scope: { productId?: string; locationId?: string },
) {
  const active = context.role === "admin" ? {} : { active: true };
  if (
    scope.productId &&
    !(await Product.exists({
      _id: scope.productId,
      organizationId: context.organizationId,
      ...active,
    }))
  ) {
    throw new AppError(
      404,
      "PRODUCT_NOT_FOUND",
      "Produkten kunde inte hittas.",
    );
  }
  if (scope.locationId) {
    const location = await Location.findOne({
      _id: scope.locationId,
      organizationId: context.organizationId,
      ...active,
    }).lean();
    if (
      !location ||
      !(await Warehouse.exists({
        _id: location.warehouseId,
        organizationId: context.organizationId,
        ...active,
      }))
    ) {
      throw new AppError(
        404,
        "LOCATION_NOT_FOUND",
        "Lagerplatsen kunde inte hittas.",
      );
    }
  }
}
export async function getStockPair(context: TenantContext, input: unknown) {
  const pair = stockPairSchema.parse(input);
  await checkScope(context, pair);
  const record = await InventoryLevel.findOne({
    ...pair,
    organizationId: context.organizationId,
  }).lean();
  return {
    productId: pair.productId,
    locationId: pair.locationId,
    quantity: record?.quantity ?? 0,
    version: record?.version ?? null,
  };
}

export async function placeProduct(context: TenantContext, input: unknown) {
  const data = stockPairSchema.parse(input);
  const db = await connectDb();
  try {
    return await db.connection.transaction(async (session) => {
      const location = await Location.findOne({
        _id: data.locationId,
        organizationId: context.organizationId,
        active: true,
      }).session(session);
      if (!location)
        throw new AppError(
          404,
          "LOCATION_NOT_FOUND",
          "Välj en aktiv lagerplats i ditt företag.",
        );
      const warehouse = await Warehouse.findOneAndUpdate(
        {
          _id: location.warehouseId,
          organizationId: context.organizationId,
          active: true,
        },
        { $inc: { locationRevision: 1 } },
        { session, returnDocument: "after" },
      );
      if (!warehouse)
        throw new AppError(409, "WAREHOUSE_INACTIVE", "Lagret är inte aktivt.");
      const lockedLocation = await Location.findOneAndUpdate(
        {
          _id: location._id,
          organizationId: context.organizationId,
          active: true,
        },
        { $inc: { stockRevision: 1 } },
        { session, returnDocument: "after" },
      );
      if (!lockedLocation)
        throw new AppError(
          409,
          "LOCATION_INACTIVE",
          "Lagerplatsen är inte aktiv.",
        );
      const product = await Product.findOneAndUpdate(
        {
          _id: data.productId,
          organizationId: context.organizationId,
          active: true,
        },
        { $inc: { stockRevision: 1 } },
        { session, returnDocument: "after" },
      );
      if (!product)
        throw new AppError(
          404,
          "PRODUCT_NOT_FOUND",
          "Välj en aktiv produkt i ditt företag.",
        );
      if (
        await InventoryLevel.exists({
          organizationId: context.organizationId,
          productId: product._id,
          locationId: location._id,
        }).session(session)
      )
        throw new AppError(
          409,
          "PRODUCT_ALREADY_PLACED",
          "Produkten är redan placerad på lagerplatsen.",
        );
      const [level] = await InventoryLevel.create(
        [
          {
            organizationId: context.organizationId,
            warehouseId: warehouse._id,
            productId: product._id,
            locationId: location._id,
            quantity: 0,
            version: 1,
          },
        ],
        { session },
      );
      return {
        productId: String(product._id),
        locationId: String(location._id),
        quantity: level.quantity,
        version: level.version,
      };
    });
  } catch (error) {
    if (isDuplicateKey(error))
      throw new AppError(
        409,
        "PRODUCT_ALREADY_PLACED",
        "Produkten är redan placerad på lagerplatsen.",
      );
    throw error;
  }
}

export async function listStock(context: TenantContext, input: unknown) {
  const scope = stockScopeSchema.parse(input);
  await checkScope(context, scope);
  const records = await InventoryLevel.find({
    ...scope,
    organizationId: context.organizationId,
  })
    .sort({ _id: 1 })
    .lean();
  const active = context.role === "admin" ? {} : { active: true };
  const [products, locations, warehouses] = await Promise.all([
    Product.find({
      organizationId: context.organizationId,
      _id: { $in: records.map((row) => row.productId) },
      ...active,
    }).lean(),
    Location.find({
      organizationId: context.organizationId,
      _id: { $in: records.map((row) => row.locationId) },
      ...active,
    }).lean(),
    Warehouse.find({
      organizationId: context.organizationId,
      _id: { $in: records.map((row) => row.warehouseId) },
      ...active,
    }).lean(),
  ]);
  const productMap = new Map(products.map((row) => [String(row._id), row]));
  const locationMap = new Map(locations.map((row) => [String(row._id), row]));
  const warehouseMap = new Map(warehouses.map((row) => [String(row._id), row]));
  const items = records
    .flatMap((row) => {
      const product = productMap.get(String(row.productId)),
        location = locationMap.get(String(row.locationId)),
        warehouse = warehouseMap.get(String(row.warehouseId));
      if (
        !product ||
        !location ||
        !warehouse ||
        !location.warehouseId.equals(row.warehouseId)
      )
        return [];
      return [
        {
          id: String(row._id),
          productId: String(row.productId),
          locationId: String(row.locationId),
          productName: product.name,
          photoUrl: product.hasPhoto ? "/api/products/" + product._id + "/photo?v=" + product.updatedAt.getTime() : product.imageUrl,
          sku: product.sku,
          locationCode: location.code,
          warehouseName: warehouse.name,
          quantity: row.quantity,
          version: row.version,
          active: product.active && location.active && warehouse.active,
        },
      ];
    })
    .sort((a, b) =>
      scope.productId
        ? a.warehouseName.localeCompare(b.warehouseName, "sv") ||
          a.locationCode.localeCompare(b.locationCode, "sv", { numeric: true })
        : a.productName.localeCompare(b.productName, "sv"),
    );
  return {
    items,
    total: items
      .reduce((sum, row) => sum + BigInt(row.quantity), BigInt(0))
      .toString(),
  };
}
function stale(): never {
  throw new AppError(
    409,
    "STOCK_CONFLICT",
    "Saldot har ändrats av någon annan. Läs in aktuellt saldo och kontrollera ditt nya antal innan du sparar igen.",
  );
}

type ParsedMovement = ReturnType<typeof stockMovementSchema.parse>;
type TransferMovement = Extract<ParsedMovement, { type: "TRANSFER" }>;

async function registerStockTransfer(
  context: TenantContext,
  data: TransferMovement,
) {
  const db = await connectDb();
  try {
    return await db.connection.transaction(async (session) => {
      const locations = await Location.find({
        _id: { $in: [data.sourceLocationId, data.destinationLocationId] },
        organizationId: context.organizationId,
        active: true,
      }).session(session);
      if (locations.length !== 2)
        throw new AppError(
          404,
          "LOCATION_NOT_FOUND",
          "En av lagerplatserna kunde inte hittas.",
        );

      const source = locations.find(
        (row) => String(row._id) === data.sourceLocationId,
      )!;
      const destination = locations.find(
        (row) => String(row._id) === data.destinationLocationId,
      )!;
      const warehouseIds = [
        ...new Set(locations.map((row) => String(row.warehouseId))),
      ].sort();
      const warehouses = [];
      for (const warehouseId of warehouseIds) {
        const warehouse = await Warehouse.findOneAndUpdate(
          {
            _id: warehouseId,
            organizationId: context.organizationId,
            active: true,
          },
          { $inc: { locationRevision: 1 } },
          { session, returnDocument: "after" },
        );
        if (!warehouse)
          throw new AppError(
            409,
            "WAREHOUSE_INACTIVE",
            "Ett av lagren är inte längre aktivt.",
          );
        warehouses.push(warehouse);
      }
      for (const locationId of [
        data.sourceLocationId,
        data.destinationLocationId,
      ].sort()) {
        const locked = await Location.findOneAndUpdate(
          {
            _id: locationId,
            organizationId: context.organizationId,
            active: true,
          },
          { $inc: { stockRevision: 1 } },
          { session, returnDocument: "after" },
        );
        if (!locked)
          throw new AppError(
            409,
            "LOCATION_INACTIVE",
            "En av lagerplatserna är inte längre aktiv.",
          );
      }

      const product = await Product.findOneAndUpdate(
        {
          _id: data.productId,
          organizationId: context.organizationId,
          active: true,
        },
        { $inc: { stockRevision: 1 } },
        { session, returnDocument: "after" },
      );
      if (!product)
        throw new AppError(
          404,
          "PRODUCT_NOT_FOUND",
          "Produkten kunde inte hittas.",
        );

      const levelFilter = {
        organizationId: context.organizationId,
        productId: product._id,
      };
      const levels = await InventoryLevel.find({
        ...levelFilter,
        locationId: { $in: [source._id, destination._id] },
      }).session(session);
      const sourceLevel = levels.find((row) => row.locationId.equals(source._id));
      const destinationLevel = levels.find((row) =>
        row.locationId.equals(destination._id),
      );
      if (
        !sourceLevel ||
        sourceLevel.version !== data.expectedSourceVersion ||
        (destinationLevel?.version ?? null) !== data.expectedDestinationVersion
      )
        stale();
      if (data.quantity === 0 && sourceLevel.quantity !== 0)
        throw new AppError(
          400,
          "INVALID_TRANSFER_QUANTITY",
          "Ange hur många enheter som ska flyttas.",
        );
      if (sourceLevel.quantity < data.quantity)
        throw new AppError(
          400,
          "INSUFFICIENT_STOCK",
          "Det finns inte tillräckligt saldo på källplatsen.",
        );
      if (
        (destinationLevel?.quantity ?? 0) >
        Number.MAX_SAFE_INTEGER - data.quantity
      )
        throw new AppError(400, "STOCK_LIMIT", "Saldot skulle bli för stort.");
      const fullTransfer = data.quantity === sourceLevel.quantity;
      const destinationChanges = data.quantity > 0 || !destinationLevel;
      if (
        (!fullTransfer && sourceLevel.version >= Number.MAX_SAFE_INTEGER) ||
        (destinationChanges &&
          (destinationLevel?.version ?? 0) >= Number.MAX_SAFE_INTEGER)
      )
        throw new AppError(
          409,
          "VERSION_LIMIT",
          "Saldot kan inte ändras fler gånger.",
        );

      const sourceBefore = sourceLevel.quantity;
      const destinationBefore = destinationLevel?.quantity ?? 0;
      const sourceAfter = sourceBefore - data.quantity;
      const destinationAfter = destinationBefore + data.quantity;
      let updatedSource = null;
      if (fullTransfer) {
        const deleted = await InventoryLevel.deleteOne(
          {
            ...levelFilter,
            locationId: source._id,
            version: data.expectedSourceVersion,
          },
          { session },
        );
        if (deleted.deletedCount !== 1) stale();
      } else {
        updatedSource = await InventoryLevel.findOneAndUpdate(
          {
            ...levelFilter,
            locationId: source._id,
            version: data.expectedSourceVersion,
          },
          { $set: { quantity: sourceAfter }, $inc: { version: 1 } },
          { session, returnDocument: "after", runValidators: true },
        );
        if (!updatedSource) stale();
      }

      let updatedDestination;
      if (destinationLevel) {
        if (data.quantity === 0) {
          updatedDestination = destinationLevel;
        } else {
          updatedDestination = await InventoryLevel.findOneAndUpdate(
            {
              ...levelFilter,
              locationId: destination._id,
              version: data.expectedDestinationVersion,
            },
            { $set: { quantity: destinationAfter }, $inc: { version: 1 } },
            { session, returnDocument: "after", runValidators: true },
          );
          if (!updatedDestination) stale();
        }
      } else {
        [updatedDestination] = await InventoryLevel.create(
          [
            {
              ...levelFilter,
              warehouseId: destination.warehouseId,
              locationId: destination._id,
              quantity: destinationAfter,
              version: 1,
            },
          ],
          { session },
        );
      }

      const actor = await User.findById(context.userId)
        .select("name")
        .session(session)
        .lean();
      const sourceWarehouse = warehouses.find((row) =>
        row._id.equals(source.warehouseId),
      )!;
      const destinationWarehouse = warehouses.find((row) =>
        row._id.equals(destination.warehouseId),
      )!;
      const transferId = new Types.ObjectId();
      const shared = {
        organizationId: context.organizationId,
        productId: product._id,
        type: "TRANSFER" as const,
        transferId,
        performedBy: context.userId,
        performedByName: actor?.name ?? "Användare",
        productName: product.name,
        sku: product.sku,
        reason: data.reason,
      };
      await InventoryMovement.create(
        [
          {
            ...shared,
            warehouseId: sourceWarehouse._id,
            locationId: source._id,
            locationCode: source.code,
            warehouseName: sourceWarehouse.name,
            transferDirection: "SOURCE",
            counterpartLocationId: destination._id,
            counterpartLocationCode: destination.code,
            counterpartWarehouseName: destinationWarehouse.name,
            previousQuantity: sourceBefore,
            newQuantity: sourceAfter,
            difference: -data.quantity,
          },
          {
            ...shared,
            warehouseId: destinationWarehouse._id,
            locationId: destination._id,
            locationCode: destination.code,
            warehouseName: destinationWarehouse.name,
            transferDirection: "DESTINATION",
            counterpartLocationId: source._id,
            counterpartLocationCode: source.code,
            counterpartWarehouseName: sourceWarehouse.name,
            previousQuantity: destinationBefore,
            newQuantity: destinationAfter,
            difference: data.quantity,
          },
        ],
        { session, ordered: true },
      );
      return {
        type: data.type,
        transferId: String(transferId),
        productId: String(product._id),
        quantity: data.quantity,
        source: {
          locationId: String(source._id),
          quantity: sourceAfter,
          version: updatedSource?.version ?? null,
          removed: fullTransfer,
        },
        destination: {
          locationId: String(destination._id),
          quantity: updatedDestination.quantity,
          version: updatedDestination.version,
        },
      };
    });
  } catch (error) {
    if (isDuplicateKey(error)) stale();
    throw error;
  }
}

export async function registerStockMovement(
  context: TenantContext,
  input: unknown,
) {
  const data = stockMovementSchema.parse(input);
  if (data.type === "TRANSFER") return registerStockTransfer(context, data);
  if (data.type === "CORRECTION") requireAdmin(context);
  const db = await connectDb();
  try {
    return await db.connection.transaction(async (session) => {
      const location = await Location.findOne({
        _id: data.locationId,
        organizationId: context.organizationId,
        active: true,
      }).session(session);
      if (!location)
        throw new AppError(
          404,
          "LOCATION_NOT_FOUND",
          "Lagerplatsen kunde inte hittas.",
        );
      const warehouse = await Warehouse.findOneAndUpdate(
        {
          _id: location.warehouseId,
          organizationId: context.organizationId,
          active: true,
        },
        { $inc: { locationRevision: 1 } },
        { session, returnDocument: "after" },
      );
      if (!warehouse)
        throw new AppError(409, "WAREHOUSE_INACTIVE", "Lagret är inte aktivt.");
      const lockedLocation = await Location.findOneAndUpdate(
        {
          _id: location._id,
          organizationId: context.organizationId,
          active: true,
        },
        { $inc: { stockRevision: 1 } },
        { session, returnDocument: "after" },
      );
      if (!lockedLocation)
        throw new AppError(
          409,
          "LOCATION_INACTIVE",
          "Lagerplatsen är inte aktiv.",
        );
      const product = await Product.findOneAndUpdate(
        {
          _id: data.productId,
          organizationId: context.organizationId,
          active: true,
        },
        { $inc: { stockRevision: 1 } },
        { session, returnDocument: "after" },
      );
      if (!product)
        throw new AppError(
          404,
          "PRODUCT_NOT_FOUND",
          "Produkten kunde inte hittas.",
        );
      const filter = {
        organizationId: context.organizationId,
        productId: product._id,
        locationId: location._id,
      };
      const current = await InventoryLevel.findOne(filter).session(session);
      if ((current?.version ?? null) !== data.expectedVersion) stale();
      const previousQuantity = current?.quantity ?? 0;
      let newQuantity: number;
      if (data.type === "RECEIPT") {
        if (data.quantity > Number.MAX_SAFE_INTEGER - previousQuantity)
          throw new AppError(
            400,
            "STOCK_LIMIT",
            "Saldot skulle bli för stort.",
          );
        newQuantity = previousQuantity + data.quantity;
      } else {
        newQuantity = data.quantity;
        if (newQuantity === previousQuantity)
          throw new AppError(
            400,
            "STOCK_UNCHANGED",
            "Ange ett annat antal än det nuvarande saldot.",
          );
      }
      if (current && current.version >= Number.MAX_SAFE_INTEGER)
        throw new AppError(
          409,
          "VERSION_LIMIT",
          "Saldot kan inte ändras fler gånger.",
        );
      let record;
      if (current) {
        record = await InventoryLevel.findOneAndUpdate(
          { ...filter, version: data.expectedVersion },
          { $set: { quantity: newQuantity }, $inc: { version: 1 } },
          { session, returnDocument: "after", runValidators: true },
        );
        if (!record) stale();
      } else {
        [record] = await InventoryLevel.create(
          [
            {
              ...filter,
              warehouseId: warehouse._id,
              quantity: newQuantity,
              version: 1,
            },
          ],
          { session },
        );
      }
      const actor = await User.findOne({ _id: context.userId })
        .select("name")
        .session(session)
        .lean();
      await InventoryMovement.create(
        [
          {
            organizationId: context.organizationId,
            warehouseId: warehouse._id,
            productId: product._id,
            locationId: location._id,
            type: data.type,
            previousQuantity,
            newQuantity,
            difference: newQuantity - previousQuantity,
            performedBy: context.userId,
            performedByName: actor?.name ?? "Användare",
            productName: product.name,
            sku: product.sku,
            locationCode: location.code,
            warehouseName: warehouse.name,
            reason: data.reason,
          },
        ],
        { session },
      );
      return {
        type: data.type,
        productId: String(product._id),
        locationId: String(location._id),
        quantity: record.quantity,
        version: record.version,
      };
    });
  } catch (error) {
    if (isDuplicateKey(error)) stale();
    throw error;
  }
}
export async function listMovements(context: TenantContext, input: unknown) {
  requireAdmin(context);
  const { page: requestedPage, q, kind, ...scope } = historyQuerySchema.parse(input);
  if (scope.productId || scope.locationId) await checkScope(context, scope);
  const filter = { organizationId: context.organizationId, ...scope,
    type: { $in: historyMovementTypes[kind] },
    ...(q ? { $or: historySearch(q) } : {}) };
  const total = await InventoryMovement.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / 20)),
    page = Math.min(requestedPage, pages);
  const records = await InventoryMovement.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * 20)
    .limit(20)
    .lean();
  return {
    page,
    pages,
    total,
    items: records.map((row) => ({
      id: String(row._id),
      type: row.type,
      inventorySessionId: row.inventorySessionId
        ? String(row.inventorySessionId)
        : null,
      transferId: row.transferId ? String(row.transferId) : null,
      transferDirection: row.transferDirection ?? null,
      counterpartLocationId: row.counterpartLocationId
        ? String(row.counterpartLocationId)
        : null,
      counterpartLocationCode: row.counterpartLocationCode ?? null,
      counterpartWarehouseName: row.counterpartWarehouseName ?? null,
      previousQuantity: row.previousQuantity,
      newQuantity: row.newQuantity,
      difference: row.difference,
      reason: row.reason,
      productName: row.productName,
      sku: row.sku,
      locationCode: row.locationCode,
      warehouseName: row.warehouseName,
      performedByName: row.performedByName,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
export type StockData = Awaited<ReturnType<typeof listStock>>;
export type StockPair = Awaited<ReturnType<typeof getStockPair>>;
export type MovementData = Awaited<ReturnType<typeof listMovements>>;
