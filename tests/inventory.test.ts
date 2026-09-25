
import assert from "node:assert/strict";
import { before, after, test, mock } from "node:test";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Types } from "mongoose";
import { connectDb } from "../src/lib/server/db";
import { AppError } from "../src/lib/server/errors";
import type { TenantContext } from "../src/lib/server/tenant";
import { Product } from "../src/models/product";
import { ProductPhoto } from "../src/models/product-photo";
import { Warehouse } from "../src/models/warehouse";
import { Location } from "../src/models/location";
import { User } from "../src/models/user";
import { InventoryLevel } from "../src/models/inventory-level";
import { InventoryMovement } from "../src/models/inventory-movement";
import { createProduct, updateProduct, getProduct } from "../src/features/products/service";
import { createWarehouse, updateWarehouse } from "../src/features/warehouses/service";
import { createLocation, updateLocation, getLocation } from "../src/features/locations/service";
import { adjustStock, getStockPair, listStock, listMovements, registerStockMovement } from "../src/features/inventory/service";
import { stockAdjustmentSchema, stockMovementSchema } from "../src/validation/inventory";

let replica: MongoMemoryReplSet;
before(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = replica.getUri();
  process.env.MONGODB_DB = "storageviewr_inventory_tests";
  await connectDb();
  for (const model of [Product, ProductPhoto, Warehouse, Location, User, InventoryLevel, InventoryMovement]) {
    await model.createCollection(); await model.createIndexes();
  }
});
after(async () => { await (await connectDb()).disconnect(); await replica?.stop(); });
const tenant = (): TenantContext => ({ userId: new Types.ObjectId(), organizationId: new Types.ObjectId(), role: "admin" });
const status = (expected: number) => (error: unknown) => error instanceof AppError && error.status === expected;
const productInput = { name: "Arbetshandske", sku: "GLOVE-01" };
const parts = { zone: "A", shelf: "01", position: "01" };
async function fixture(context = tenant()) {
  const product = await createProduct(context, productInput);
  const warehouse = await createWarehouse(context, { name: "Huvudlager", code: "MAIN" });
  const location = await createLocation(context, { ...parts, warehouseId: warehouse.id });
  const change = (quantity: number, expectedVersion: number | null = null) => ({
    productId: product.id, locationId: location.id, quantity, expectedVersion, reason: "Inleverans",
  });
  return { context, product, warehouse, location, change };
}

test("one product can occupy several places with independent balances and accurate totals", async () => {
  const f = await fixture();
  const second = await createLocation(f.context, { ...parts, position: "02", warehouseId: f.warehouse.id });
  assert.deepEqual(await getStockPair(f.context, { productId: f.product.id, locationId: f.location.id }), {
    productId: f.product.id, locationId: f.location.id, quantity: 0, version: null,
  });
  await adjustStock(f.context, f.change(12));
  await adjustStock(f.context, { ...f.change(48), locationId: second.id });
  const stock = await listStock(f.context, { productId: f.product.id });
  assert.equal(stock.total, "60"); assert.equal(stock.items.length, 2);
  assert.equal((await listStock(f.context, { locationId: second.id })).items[0].quantity, 48);
  await assert.rejects(InventoryLevel.create({ organizationId: f.context.organizationId, warehouseId: f.warehouse.id,
    productId: f.product.id, locationId: f.location.id, quantity: 1, version: 1 }));
});

test("balances and movements isolate all product, location and warehouse references by tenant", async () => {
  const a = await fixture(), b = await fixture();
  await adjustStock(a.context, a.change(5));
  await adjustStock(b.context, b.change(99));
  await assert.rejects(adjustStock(a.context, { ...a.change(10), productId: b.product.id }), status(404));
  await assert.rejects(adjustStock(a.context, { ...a.change(10), locationId: b.location.id }), status(404));
  await assert.rejects(getStockPair(a.context, { productId: a.product.id, locationId: b.location.id }), status(404));
  await assert.rejects(listStock(a.context, { productId: b.product.id }), status(404));
  await assert.rejects(listMovements(a.context, { locationId: b.location.id }), status(404));
  assert.equal((await listStock(a.context, { productId: a.product.id })).total, "5");
  assert.equal((await listMovements(a.context, { productId: a.product.id })).total, 1);
});

test("warehouse users read current stock but cannot adjust it or read administrative history", async () => {
  const f = await fixture(), worker: TenantContext = { ...f.context, role: "warehouse" };
  await adjustStock(f.context, f.change(3));
  assert.equal((await listStock(worker, { locationId: f.location.id })).total, "3");
  await assert.rejects(adjustStock(worker, f.change(4, 1)), status(403));
  await assert.rejects(listMovements(worker, { productId: f.product.id }), status(403));
  assert.equal((await getStockPair(worker, { productId: f.product.id, locationId: f.location.id })).quantity, 3);
});

test("warehouse users register receipts and issues while corrections remain administrative", async () => {
  const f = await fixture();
  const worker: TenantContext = { ...f.context, role: "warehouse" };
  await registerStockMovement(worker, {
    type: "RECEIPT",
    productId: f.product.id,
    locationId: f.location.id,
    quantity: 10,
    expectedVersion: null,
    reason: "Leverans 1001",
  });
  assert.deepEqual(
    await getStockPair(worker, {
      productId: f.product.id,
      locationId: f.location.id,
    }),
    {
      productId: f.product.id,
      locationId: f.location.id,
      quantity: 10,
      version: 1,
    },
  );
  await registerStockMovement(worker, {
    type: "ISSUE",
    productId: f.product.id,
    locationId: f.location.id,
    quantity: 3,
    expectedVersion: 1,
    reason: "Utlämning till montör",
  });
  await assert.rejects(
    registerStockMovement(worker, {
      type: "CORRECTION",
      productId: f.product.id,
      locationId: f.location.id,
      quantity: 6,
      expectedVersion: 2,
      reason: "Felregistrering",
    }),
    status(403),
  );
  await registerStockMovement(f.context, {
    type: "CORRECTION",
    productId: f.product.id,
    locationId: f.location.id,
    quantity: 6,
    expectedVersion: 2,
    reason: "Felregistrering verifierad",
  });
  const history = await listMovements(f.context, { productId: f.product.id });
  assert.deepEqual(
    history.items.map((row) => row.type),
    ["CORRECTION", "ISSUE", "RECEIPT"],
  );
  assert.equal(history.items[1].difference, -3);
  assert.equal(
    (
      await getStockPair(worker, {
        productId: f.product.id,
        locationId: f.location.id,
      })
    ).quantity,
    6,
  );
});

test("transfers update both places atomically and retain one linked audit pair", async () => {
  const f = await fixture();
  const worker: TenantContext = { ...f.context, role: "warehouse" };
  const secondWarehouse = await createWarehouse(f.context, {
    name: "Reservlager",
    code: "RESERVE",
  });
  const destination = await createLocation(f.context, {
    ...parts,
    warehouseId: secondWarehouse.id,
  });
  await registerStockMovement(worker, {
    type: "RECEIPT",
    productId: f.product.id,
    locationId: f.location.id,
    quantity: 10,
    expectedVersion: null,
    reason: "Startsaldo",
  });
  const transfer = await registerStockMovement(worker, {
    type: "TRANSFER",
    productId: f.product.id,
    sourceLocationId: f.location.id,
    destinationLocationId: destination.id,
    quantity: 4,
    expectedSourceVersion: 1,
    expectedDestinationVersion: null,
    reason: "Påfyllning av reservlager",
  });
  assert.equal(transfer.type, "TRANSFER");
  assert.equal(
    (
      await getStockPair(worker, {
        productId: f.product.id,
        locationId: f.location.id,
      })
    ).quantity,
    6,
  );
  assert.equal(
    (
      await getStockPair(worker, {
        productId: f.product.id,
        locationId: destination.id,
      })
    ).quantity,
    4,
  );
  assert.equal((await listStock(worker, { productId: f.product.id })).total, "10");
  const transferRows = await InventoryMovement.find({
    transferId: new Types.ObjectId(transfer.transferId),
  }).lean();
  assert.equal(transferRows.length, 2);
  assert.deepEqual(
    new Set(transferRows.map((row) => row.type)),
    new Set(["TRANSFER_OUT", "TRANSFER_IN"]),
  );
  await assert.rejects(
    registerStockMovement(worker, {
      type: "TRANSFER",
      productId: f.product.id,
      sourceLocationId: f.location.id,
      destinationLocationId: destination.id,
      quantity: 7,
      expectedSourceVersion: 2,
      expectedDestinationVersion: 1,
      reason: "För stor flytt",
    }),
    status(400),
  );
  await assert.rejects(
    registerStockMovement(worker, {
      type: "TRANSFER",
      productId: f.product.id,
      sourceLocationId: f.location.id,
      destinationLocationId: destination.id,
      quantity: 1,
      expectedSourceVersion: 1,
      expectedDestinationVersion: 1,
      reason: "Gammal version",
    }),
    status(409),
  );
  const foreign = await fixture();
  await assert.rejects(
    registerStockMovement(worker, {
      type: "TRANSFER",
      productId: f.product.id,
      sourceLocationId: f.location.id,
      destinationLocationId: foreign.location.id,
      quantity: 1,
      expectedSourceVersion: 2,
      expectedDestinationVersion: null,
      reason: "Otillåten flytt",
    }),
    status(404),
  );
  const failure = mock.method(InventoryMovement, "create", async () => {
    throw new Error("Injected transfer history failure");
  });
  try {
    await assert.rejects(
      registerStockMovement(worker, {
        type: "TRANSFER",
        productId: f.product.id,
        sourceLocationId: f.location.id,
        destinationLocationId: destination.id,
        quantity: 1,
        expectedSourceVersion: 2,
        expectedDestinationVersion: 1,
        reason: "Flytt som rullas tillbaka",
      }),
      /Injected transfer history failure/,
    );
  } finally {
    failure.mock.restore();
  }
  assert.equal(
    (
      await getStockPair(worker, {
        productId: f.product.id,
        locationId: f.location.id,
      })
    ).quantity,
    6,
  );
  assert.equal(
    (
      await getStockPair(worker, {
        productId: f.product.id,
        locationId: destination.id,
      })
    ).quantity,
    4,
  );
});

test("history records before/after, signed difference, actor, reason and original names", async () => {
  const f = await fixture();
  await User.create({ _id: f.context.userId, name: "Anna Lager", email: f.context.userId + "@example.test", passwordHash: "unused" });
  await adjustStock(f.context, f.change(10));
  await adjustStock(f.context, { ...f.change(7, 1), reason: "Tre skadade" });
  await updateProduct(f.context, f.product.id, { ...productInput, name: "Nytt namn", active: true });
  const history = await listMovements(f.context, { productId: f.product.id });
  assert.equal(history.total, 2);
  assert.equal(history.items[0].previousQuantity, 10); assert.equal(history.items[0].newQuantity, 7);
  assert.equal(history.items[0].difference, -3); assert.equal(history.items[0].reason, "Tre skadade");
  assert.equal(history.items[0].performedByName, "Anna Lager");
  assert.equal(history.items[0].productName, productInput.name);
  assert.equal(history.items[1].type, "INITIAL");
  await assert.rejects(adjustStock(f.context, f.change(7, 2)), status(400));
  assert.equal((await listMovements(f.context, { productId: f.product.id })).total, 2);
});

test("concurrent first placements and stale adjustments never overwrite another user's balance", async () => {
  const f = await fixture();
  const first = await Promise.allSettled([adjustStock(f.context, f.change(10)), adjustStock(f.context, f.change(20))]);
  assert.equal(first.filter(result => result.status === "fulfilled").length, 1);
  const edits = await Promise.allSettled([adjustStock(f.context, f.change(30, 1)), adjustStock(f.context, f.change(40, 1))]);
  assert.equal(edits.filter(result => result.status === "fulfilled").length, 1);
  for (const result of [...first, ...edits]) if (result.status === "rejected") assert.equal(result.reason.status, 409);
  const current = await getStockPair(f.context, { productId: f.product.id, locationId: f.location.id });
  assert.equal(current.version, 2);
  await assert.rejects(adjustStock(f.context, f.change(99, 1)), status(409));
  assert.equal((await listMovements(f.context, { productId: f.product.id })).total, 2);
});

test("movement write failure rolls back initial placement and subsequent adjustments", async () => {
  const f = await fixture();
  let failure = mock.method(InventoryMovement, "create", async () => { throw new Error("Injected movement failure"); });
  try { await assert.rejects(adjustStock(f.context, f.change(10)), /Injected movement failure/); }
  finally { failure.mock.restore(); }
  assert.equal(await InventoryLevel.countDocuments({ organizationId: f.context.organizationId }), 0);
  await adjustStock(f.context, f.change(10));
  failure = mock.method(InventoryMovement, "create", async () => { throw new Error("Injected movement failure"); });
  try { await assert.rejects(adjustStock(f.context, f.change(20, 1)), /Injected movement failure/); }
  finally { failure.mock.restore(); }
  assert.equal((await getStockPair(f.context, { productId: f.product.id, locationId: f.location.id })).quantity, 10);
  assert.equal((await getStockPair(f.context, { productId: f.product.id, locationId: f.location.id })).version, 1);
  assert.equal((await listMovements(f.context, { productId: f.product.id })).total, 1);
});

test("nonzero stock blocks deactivation, while zero stock keeps history and permits it", async () => {
  const f = await fixture();
  await adjustStock(f.context, f.change(10));
  await assert.rejects(updateProduct(f.context, f.product.id, { ...productInput, active: false }), status(409));
  await assert.rejects(updateLocation(f.context, f.location.id, { ...parts, active: false }), status(409));
  await assert.rejects(updateWarehouse(f.context, f.warehouse.id, { name: "Huvudlager", code: "MAIN", active: false }), status(409));
  assert.equal((await getProduct(f.context, f.product.id)).active, true);
  assert.equal((await getLocation(f.context, f.location.id)).active, true);
  await adjustStock(f.context, f.change(0, 1));
  await updateProduct(f.context, f.product.id, { ...productInput, active: false });
  await updateLocation(f.context, f.location.id, { ...parts, active: false });
  await updateWarehouse(f.context, f.warehouse.id, { name: "Huvudlager", code: "MAIN", active: false });
  assert.equal((await listMovements(f.context, { productId: f.product.id })).total, 2);
  await assert.rejects(adjustStock(f.context, f.change(10, 2)), status(404));
  await assert.rejects(listStock({ ...f.context, role: "warehouse" }, { productId: f.product.id }), status(404));
});

test("racing product and location deactivation against placement cannot leave stock on inactive references", async () => {
  for (const entity of ["product", "location"]) {
    const f = await fixture();
    const results = await Promise.allSettled([
      adjustStock(f.context, f.change(5)),
      entity === "product" ? updateProduct(f.context, f.product.id, { ...productInput, active: false })
        : updateLocation(f.context, f.location.id, { ...parts, active: false }),
    ]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    const product = await getProduct(f.context, f.product.id), location = await getLocation(f.context, f.location.id);
    const stock = await getStockPair(f.context, { productId: f.product.id, locationId: f.location.id });
    assert.ok((product.active && location.active) || stock.quantity === 0);
    assert.equal((await listMovements(f.context, { productId: f.product.id })).total, stock.quantity > 0 ? 1 : 0);
  }
});

test("input rejects unsafe quantities, missing versions, foreign tenant fields and empty reasons", async () => {
  const f = await fixture();
  for (const quantity of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN, "12"]) {
    assert.equal(stockAdjustmentSchema.safeParse({ ...f.change(1), quantity }).success, false);
  }
  for (const bad of [{ expectedVersion: undefined }, { expectedVersion: 0 }, { reason: "" },
    { organizationId: new Types.ObjectId().toString() }, { warehouseId: f.warehouse.id }, { productId: { $ne: null } }]) {
    assert.equal(stockAdjustmentSchema.safeParse({ ...f.change(1), ...bad }).success, false);
  }
  const receipt = {
    type: "RECEIPT",
    productId: f.product.id,
    locationId: f.location.id,
    quantity: 1,
    expectedVersion: null,
    reason: "Leverans",
  } as const;
  assert.equal(stockMovementSchema.safeParse(receipt).success, true);
  for (const bad of [
    { quantity: 0 },
    { quantity: -1 },
    { quantity: "1" },
    { expectedVersion: 0 },
    { reason: "" },
    { organizationId: f.context.organizationId.toString() },
  ])
    assert.equal(
      stockMovementSchema.safeParse({ ...receipt, ...bad }).success,
      false,
    );
  assert.equal(
    stockMovementSchema.safeParse({
      type: "TRANSFER",
      productId: f.product.id,
      sourceLocationId: f.location.id,
      destinationLocationId: f.location.id,
      quantity: 1,
      expectedSourceVersion: 1,
      expectedDestinationVersion: 1,
      reason: "Samma plats",
    }).success,
    false,
  );
});

test("totals remain exact above a safe JS integer and history pagination has no duplicate rows", async () => {
  const f = await fixture();
  const second = await createLocation(f.context, { ...parts, position: "02", warehouseId: f.warehouse.id });
  await adjustStock(f.context, f.change(Number.MAX_SAFE_INTEGER));
  await adjustStock(f.context, { ...f.change(Number.MAX_SAFE_INTEGER), locationId: second.id });
  assert.equal((await listStock(f.context, { productId: f.product.id })).total, (BigInt(Number.MAX_SAFE_INTEGER) * BigInt(2)).toString());
  for (let version = 1; version <= 20; version++) await adjustStock(f.context, f.change(version, version));
  const first = await listMovements(f.context, { productId: f.product.id }), last = await listMovements(f.context, { productId: f.product.id, page: 2 });
  assert.equal(first.total, 22); assert.equal(first.items.length, 20); assert.equal(last.items.length, 2);
  assert.equal(new Set([...first.items, ...last.items].map(row => row.id)).size, 22);
});
