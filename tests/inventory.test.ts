
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
import { createProduct, updateProduct, getProduct, listProducts, getProductStockCounts } from "../src/features/products/service";
import { createWarehouse, updateWarehouse } from "../src/features/warehouses/service";
import { createLocation, updateLocation, getLocation } from "../src/features/locations/service";
import { getStockPair, listStock, listMovements, placeProduct, registerStockMovement } from "../src/features/inventory/service";
import { correctStockForTest as correctStock } from "./helpers/stock";
import { listHistory } from "../src/features/inventory/history-service";
import { InventorySession } from "../src/models/inventory-session";
import { InventorySessionLocation } from "../src/models/inventory-session-location";
import { stockMovementSchema } from "../src/validation/inventory";

let replica: MongoMemoryReplSet;
before(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = replica.getUri();
  process.env.MONGODB_DB = "storageviewr_inventory_tests";
  await connectDb();
  for (const model of [Product, ProductPhoto, Warehouse, Location, User, InventoryLevel, InventoryMovement, InventorySession, InventorySessionLocation]) {
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
  await correctStock(f.context, f.change(12));
  await correctStock(f.context, { ...f.change(48), locationId: second.id });
  const stock = await listStock(f.context, { productId: f.product.id });
  assert.equal(stock.total, "60"); assert.equal(stock.items.length, 2);
  assert.equal((await listStock(f.context, { locationId: second.id })).items[0].quantity, 48);
  await assert.rejects(InventoryLevel.create({ organizationId: f.context.organizationId, warehouseId: f.warehouse.id,
    productId: f.product.id, locationId: f.location.id, quantity: 1, version: 1 }));
});

test("products can be placed with zero balance before the first receipt", async () => {
  const f = await fixture();
  const worker: TenantContext = { ...f.context, role: "warehouse" };
  const pair = { productId: f.product.id, locationId: f.location.id };
  assert.deepEqual(await placeProduct(worker, pair), {
    ...pair,
    quantity: 0,
    version: 1,
  });
  assert.deepEqual(await getStockPair(worker, pair), {
    ...pair,
    quantity: 0,
    version: 1,
  });
  const placed = await listStock(worker, { locationId: f.location.id });
  assert.equal(placed.items.length, 1);
  assert.equal(placed.items[0].quantity, 0);
  assert.equal(placed.total, "0");
  assert.equal(
    (await listMovements(f.context, { productId: f.product.id })).total,
    0,
  );
  await assert.rejects(placeProduct(worker, pair), status(409));

  await registerStockMovement(worker, {
    type: "RECEIPT",
    ...pair,
    quantity: 7,
    expectedVersion: 1,
    reason: "Första inleveransen",
  });
  assert.deepEqual(await getStockPair(worker, pair), {
    ...pair,
    quantity: 7,
    version: 2,
  });
  const history = await listMovements(f.context, {
    productId: f.product.id,
  });
  assert.equal(history.total, 1);
  assert.equal(history.items[0].type, "RECEIPT");

  const foreign = await fixture();
  await assert.rejects(
    placeProduct(worker, {
      productId: f.product.id,
      locationId: foreign.location.id,
    }),
    status(404),
  );
});

test("warehouse users move zero placements, partial balances and full balances atomically", async () => {
  const f = await fixture();
  const worker: TenantContext = { ...f.context, role: "warehouse" };
  const second = await createLocation(f.context, {
    ...parts,
    position: "02",
    warehouseId: f.warehouse.id,
  });
  const third = await createLocation(f.context, {
    ...parts,
    position: "03",
    warehouseId: f.warehouse.id,
  });

  await placeProduct(worker, {
    productId: f.product.id,
    locationId: f.location.id,
  });
  const zeroMove = await registerStockMovement(worker, {
    type: "TRANSFER",
    productId: f.product.id,
    sourceLocationId: f.location.id,
    destinationLocationId: second.id,
    expectedSourceVersion: 1,
    expectedDestinationVersion: null,
    quantity: 0,
    reason: "Ny lagerstruktur",
  });
  if (zeroMove.type !== "TRANSFER") assert.fail("Flytten gav fel svarstyp.");
  assert.equal(zeroMove.source.removed, true);
  assert.equal(zeroMove.source.version, null);
  assert.deepEqual(
    await getStockPair(worker, {
      productId: f.product.id,
      locationId: f.location.id,
    }),
    {
      productId: f.product.id,
      locationId: f.location.id,
      quantity: 0,
      version: null,
    },
  );
  assert.deepEqual(
    await getStockPair(worker, {
      productId: f.product.id,
      locationId: second.id,
    }),
    {
      productId: f.product.id,
      locationId: second.id,
      quantity: 0,
      version: 1,
    },
  );

  await registerStockMovement(worker, {
    type: "RECEIPT",
    productId: f.product.id,
    locationId: second.id,
    expectedVersion: 1,
    quantity: 5,
    reason: "Inleverans",
  });
  await assert.rejects(
    registerStockMovement(worker, {
      type: "TRANSFER",
      productId: f.product.id,
      sourceLocationId: second.id,
      destinationLocationId: third.id,
      expectedSourceVersion: 2,
      expectedDestinationVersion: null,
      quantity: 0,
      reason: "Ogiltig nollflytt",
    }),
    status(400),
  );
  await registerStockMovement(worker, {
    type: "TRANSFER",
    productId: f.product.id,
    sourceLocationId: second.id,
    destinationLocationId: third.id,
    expectedSourceVersion: 2,
    expectedDestinationVersion: null,
    quantity: 2,
    reason: "Fördela material",
  });
  assert.equal(
    (
      await getStockPair(worker, {
        productId: f.product.id,
        locationId: second.id,
      })
    ).quantity,
    3,
  );
  assert.equal(
    (
      await getStockPair(worker, {
        productId: f.product.id,
        locationId: third.id,
      })
    ).quantity,
    2,
  );

  await registerStockMovement(worker, {
    type: "TRANSFER",
    productId: f.product.id,
    sourceLocationId: second.id,
    destinationLocationId: third.id,
    expectedSourceVersion: 3,
    expectedDestinationVersion: 1,
    quantity: 3,
    reason: "Samla material",
  });
  assert.equal(
    (
      await getStockPair(worker, {
        productId: f.product.id,
        locationId: second.id,
      })
    ).version,
    null,
  );
  assert.equal(
    (
      await getStockPair(worker, {
        productId: f.product.id,
        locationId: third.id,
      })
    ).quantity,
    5,
  );
  assert.equal(
    (await listStock(worker, { productId: f.product.id })).items.length,
    1,
  );

  const movementRows = await listMovements(f.context, {
    productId: f.product.id,
  });
  assert.equal(
    movementRows.items.filter((row) => row.type === "TRANSFER").length,
    6,
  );
  const history = await listHistory(f.context, {
    productId: f.product.id,
    kind: "transfer",
  });
  assert.equal(history.total, 3);
  assert.ok(history.items.every((row) => row.balances.length === 2));
  assert.ok(history.items.every((row) => row.difference === null));
});

test("failed zero-placement transfers roll back both placement changes", async () => {
  const f = await fixture();
  const second = await createLocation(f.context, {
    ...parts,
    position: "02",
    warehouseId: f.warehouse.id,
  });
  await placeProduct(f.context, {
    productId: f.product.id,
    locationId: f.location.id,
  });
  const failure = mock.method(InventoryMovement, "create", async () => {
    throw new Error("Injected transfer failure");
  });
  try {
    await assert.rejects(
      registerStockMovement(f.context, {
        type: "TRANSFER",
        productId: f.product.id,
        sourceLocationId: f.location.id,
        destinationLocationId: second.id,
        expectedSourceVersion: 1,
        expectedDestinationVersion: null,
        quantity: 0,
        reason: "Flytt som ska återställas",
      }),
      /Injected transfer failure/,
    );
  } finally {
    failure.mock.restore();
  }
  assert.equal(
    (
      await getStockPair(f.context, {
        productId: f.product.id,
        locationId: f.location.id,
      })
    ).version,
    1,
  );
  assert.equal(
    (
      await getStockPair(f.context, {
        productId: f.product.id,
        locationId: second.id,
      })
    ).version,
    null,
  );
});

test("balances and movements isolate all product, location and warehouse references by tenant", async () => {
  const a = await fixture(), b = await fixture();
  await correctStock(a.context, a.change(5));
  await correctStock(b.context, b.change(99));
  await assert.rejects(correctStock(a.context, { ...a.change(10), productId: b.product.id }), status(404));
  await assert.rejects(correctStock(a.context, { ...a.change(10), locationId: b.location.id }), status(404));
  await assert.rejects(getStockPair(a.context, { productId: a.product.id, locationId: b.location.id }), status(404));
  await assert.rejects(listStock(a.context, { productId: b.product.id }), status(404));
  await assert.rejects(listMovements(a.context, { locationId: b.location.id }), status(404));
  await assert.rejects(
    registerStockMovement(a.context, {
      type: "TRANSFER",
      productId: a.product.id,
      sourceLocationId: a.location.id,
      destinationLocationId: b.location.id,
      expectedSourceVersion: 1,
      expectedDestinationVersion: null,
      quantity: 5,
      reason: "Otillåten företagsöverskridande flytt",
    }),
    status(404),
  );
  assert.equal((await listStock(a.context, { productId: a.product.id })).total, "5");
  assert.equal((await listMovements(a.context, { productId: a.product.id })).total, 1);
});

test("warehouse users read current stock but cannot adjust it or read administrative history", async () => {
  const f = await fixture(), worker: TenantContext = { ...f.context, role: "warehouse" };
  await correctStock(f.context, f.change(3));
  assert.equal((await listStock(worker, { locationId: f.location.id })).total, "3");
  await assert.rejects(correctStock(worker, f.change(4, 1)), status(403));
  await assert.rejects(listMovements(worker, { productId: f.product.id }), status(403));
  assert.equal((await getStockPair(worker, { productId: f.product.id, locationId: f.location.id })).quantity, 3);
});

test("warehouse users register receipts while corrections remain administrative", async () => {
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

  await assert.rejects(
    registerStockMovement(worker, {
      type: "CORRECTION",
      productId: f.product.id,
      locationId: f.location.id,
      quantity: 6,
      expectedVersion: 1,
      reason: "Felregistrering",
    }),
    status(403),
  );
  await registerStockMovement(f.context, {
    type: "CORRECTION",
    productId: f.product.id,
    locationId: f.location.id,
    quantity: 6,
    expectedVersion: 1,
    reason: "Felregistrering verifierad",
  });
  const history = await listMovements(f.context, { productId: f.product.id });
  assert.deepEqual(
    history.items.map((row) => row.type),
    ["CORRECTION", "RECEIPT"],
  );
  assert.equal(history.items[0].difference, -4);
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

test("history records before/after, signed difference, actor, reason and original names", async () => {
  const f = await fixture();
  await User.create({ _id: f.context.userId, name: "Anna Lager", email: f.context.userId + "@example.test", passwordHash: "unused" });
  await correctStock(f.context, f.change(10));
  await correctStock(f.context, { ...f.change(7, 1), reason: "Tre skadade" });
  await updateProduct(f.context, f.product.id, { ...productInput, name: "Nytt namn", active: true });
  const history = await listMovements(f.context, { productId: f.product.id });
  assert.equal(history.total, 2);
  assert.equal(history.items[0].previousQuantity, 10); assert.equal(history.items[0].newQuantity, 7);
  assert.equal(history.items[0].difference, -3); assert.equal(history.items[0].reason, "Tre skadade");
  assert.equal(history.items[0].performedByName, "Anna Lager");
  assert.equal(history.items[0].productName, productInput.name);
  assert.equal(history.items[1].type, "CORRECTION");
  await assert.rejects(correctStock(f.context, f.change(7, 2)), status(400));
  assert.equal((await listMovements(f.context, { productId: f.product.id })).total, 2);
});

test("concurrent first placements and stale adjustments never overwrite another user's balance", async () => {
  const f = await fixture();
  const first = await Promise.allSettled([correctStock(f.context, f.change(10)), correctStock(f.context, f.change(20))]);
  assert.equal(first.filter(result => result.status === "fulfilled").length, 1);
  const edits = await Promise.allSettled([correctStock(f.context, f.change(30, 1)), correctStock(f.context, f.change(40, 1))]);
  assert.equal(edits.filter(result => result.status === "fulfilled").length, 1);
  for (const result of [...first, ...edits]) if (result.status === "rejected") assert.equal(result.reason.status, 409);
  const current = await getStockPair(f.context, { productId: f.product.id, locationId: f.location.id });
  assert.equal(current.version, 2);
  await assert.rejects(correctStock(f.context, f.change(99, 1)), status(409));
  assert.equal((await listMovements(f.context, { productId: f.product.id })).total, 2);
});

test("movement write failure rolls back initial and subsequent corrections", async () => {
  const f = await fixture();
  let failure = mock.method(InventoryMovement, "create", async () => { throw new Error("Injected movement failure"); });
  try { await assert.rejects(correctStock(f.context, f.change(10)), /Injected movement failure/); }
  finally { failure.mock.restore(); }
  assert.equal(await InventoryLevel.countDocuments({ organizationId: f.context.organizationId }), 0);
  await correctStock(f.context, f.change(10));
  failure = mock.method(InventoryMovement, "create", async () => { throw new Error("Injected movement failure"); });
  try { await assert.rejects(correctStock(f.context, f.change(20, 1)), /Injected movement failure/); }
  finally { failure.mock.restore(); }
  assert.equal((await getStockPair(f.context, { productId: f.product.id, locationId: f.location.id })).quantity, 10);
  assert.equal((await getStockPair(f.context, { productId: f.product.id, locationId: f.location.id })).version, 1);
  assert.equal((await listMovements(f.context, { productId: f.product.id })).total, 1);
});

test("nonzero stock blocks deactivation, while zero stock keeps history and permits it", async () => {
  const f = await fixture();
  await correctStock(f.context, f.change(10));
  await assert.rejects(updateProduct(f.context, f.product.id, { ...productInput, active: false }), status(409));
  await assert.rejects(updateLocation(f.context, f.location.id, { ...parts, active: false }), status(409));
  await assert.rejects(updateWarehouse(f.context, f.warehouse.id, { name: "Huvudlager", code: "MAIN", active: false }), status(409));
  assert.equal((await getProduct(f.context, f.product.id)).active, true);
  assert.equal((await getLocation(f.context, f.location.id)).active, true);
  await correctStock(f.context, f.change(0, 1));
  await updateProduct(f.context, f.product.id, { ...productInput, active: false });
  await updateLocation(f.context, f.location.id, { ...parts, active: false });
  await updateWarehouse(f.context, f.warehouse.id, { name: "Huvudlager", code: "MAIN", active: false });
  assert.equal((await listMovements(f.context, { productId: f.product.id })).total, 2);
  await assert.rejects(correctStock(f.context, f.change(10, 2)), status(404));
  await assert.rejects(listStock({ ...f.context, role: "warehouse" }, { productId: f.product.id }), status(404));
});

test("racing product and location deactivation against placement cannot leave stock on inactive references", async () => {
  for (const entity of ["product", "location"]) {
    const f = await fixture();
    const results = await Promise.allSettled([
      correctStock(f.context, f.change(5)),
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
  const correction = { type: "CORRECTION", ...f.change(1) } as const;
  assert.equal(stockMovementSchema.safeParse({ ...correction, quantity: 0 }).success, true);
  for (const quantity of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN, "12"])
    assert.equal(stockMovementSchema.safeParse({ ...correction, quantity }).success, false);
  for (const bad of [{ expectedVersion: undefined }, { expectedVersion: 0 }, { reason: "" },
    { organizationId: new Types.ObjectId().toString() }, { warehouseId: f.warehouse.id }, { productId: { $ne: null } }])
    assert.equal(stockMovementSchema.safeParse({ ...correction, ...bad }).success, false);
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

  const transfer = {
    type: "TRANSFER",
    productId: f.product.id,
    sourceLocationId: f.location.id,
    destinationLocationId: new Types.ObjectId().toString(),
    expectedSourceVersion: 1,
    expectedDestinationVersion: null,
    quantity: 0,
    reason: "Flytta placering",
  } as const;
  assert.equal(stockMovementSchema.safeParse(transfer).success, true);
  for (const bad of [
    { quantity: -1 },
    { quantity: 0.5 },
    { expectedSourceVersion: null },
    { destinationLocationId: f.location.id },
  ])
    assert.equal(
      stockMovementSchema.safeParse({ ...transfer, ...bad }).success,
      false,
    );

});

test("totals remain exact above a safe JS integer and history pagination has no duplicate rows", async () => {
  const f = await fixture();
  const second = await createLocation(f.context, { ...parts, position: "02", warehouseId: f.warehouse.id });
  await correctStock(f.context, f.change(Number.MAX_SAFE_INTEGER));
  await correctStock(f.context, { ...f.change(Number.MAX_SAFE_INTEGER), locationId: second.id });
  assert.equal((await listStock(f.context, { productId: f.product.id })).total, (BigInt(Number.MAX_SAFE_INTEGER) * BigInt(2)).toString());
  for (let version = 1; version <= 20; version++) await correctStock(f.context, f.change(version, version));
  const first = await listMovements(f.context, { productId: f.product.id }), last = await listMovements(f.context, { productId: f.product.id, page: 2 });
  assert.equal(first.total, 22); assert.equal(first.items.length, 20); assert.equal(last.items.length, 2);
  assert.equal(new Set([...first.items, ...last.items].map(row => row.id)).size, 22);
});

test("product overview sums all places exactly and stock filters precede pagination within the tenant", async () => {
  const f = await fixture();
  const second = await createLocation(f.context, { ...parts, position: "02", warehouseId: f.warehouse.id });
  await correctStock(f.context, f.change(Number.MAX_SAFE_INTEGER));
  await correctStock(f.context, { ...f.change(Number.MAX_SAFE_INTEGER), locationId: second.id });
  await createProduct(f.context, { name: "Ej placerad", sku: "UNPLACED" });
  const zero = await createProduct(f.context, { name: "Tom placering", sku: "ZERO" });
  await placeProduct(f.context, { productId: zero.id, locationId: second.id });
  const foreign = await fixture();
  await correctStock(foreign.context, foreign.change(999));
  const result = await listProducts(f.context, { stock: "in-stock" });
  assert.equal(result.total, 1);
  assert.equal(result.items[0].id, f.product.id);
  assert.equal(result.items[0].locationCount, 2);
  assert.equal(result.items[0].totalQuantity, (BigInt(Number.MAX_SAFE_INTEGER) * BigInt(2)).toString());
  assert.equal((await listProducts(f.context, { stock: "empty" })).total, 2);
  assert.equal((await listProducts(f.context, { stock: "unplaced" })).total, 1);
  assert.equal((await listProducts({ ...f.context, role: "warehouse" }, { status: "all", stock: "in-stock" })).total, 1);
  await InventoryLevel.create({ organizationId: foreign.context.organizationId,
    warehouseId: foreign.warehouse.id, productId: zero.id, locationId: foreign.location.id,
    quantity: 500, version: 1 });
  assert.deepEqual(await getProductStockCounts(f.context), { all: 3, inStock: 1, empty: 2 });
  assert.deepEqual(await getProductStockCounts(f.context, { stock: "empty" }), { all: 3, inStock: 1, empty: 2 });
  assert.deepEqual(await getProductStockCounts(f.context, { q: productInput.sku }), { all: 1, inStock: 1, empty: 0 });
  assert.deepEqual(await getProductStockCounts(f.context, { q: ".*" }), { all: 0, inStock: 0, empty: 0 });
  await assert.rejects(getProductStockCounts(f.context, { q: { $ne: null } }));
  const inactive = await createProduct(f.context, { name: "Inaktiv produkt", sku: "INACTIVE" });
  await updateProduct(f.context, inactive.id, { name: "Inaktiv produkt", sku: "INACTIVE", active: false });
  assert.deepEqual(await getProductStockCounts(f.context, { status: "all" }), { all: 4, inStock: 1, empty: 3 });
  assert.deepEqual(await getProductStockCounts(f.context, { status: "inactive" }), { all: 1, inStock: 0, empty: 1 });
  assert.deepEqual(await getProductStockCounts({ ...f.context, role: "warehouse" }, { status: "all" }),
    { all: 3, inStock: 1, empty: 2 });
  await Product.insertMany(Array.from({ length: 25 }, (_, n) => ({
    organizationId: f.context.organizationId, name: "Sidindelad produkt " + n, sku: "PAGE-" + n,
  })));
  assert.equal((await listProducts(f.context, { page: 2 })).items.length, 4);
  assert.deepEqual(await getProductStockCounts(f.context, { page: 2 }), { all: 28, inStock: 1, empty: 27 });
});

test("organization history keeps administrator authorization and tenant isolation without a resource filter", async () => {
  const f = await fixture();
  const foreign = await fixture();
  await correctStock(f.context, f.change(12));
  await correctStock(foreign.context, foreign.change(99));
  const history = await listMovements(f.context, {});
  assert.equal(history.total, 1);
  assert.equal(history.items[0].newQuantity, 12);
  await assert.rejects(listMovements({ ...f.context, role: "warehouse" }, {}), status(403));
  await assert.rejects(listMovements(f.context, { productId: f.product.id, locationId: f.location.id }));
});

test("core history pagination and tenant search stay correct", async () => {
  const f = await fixture();
  await correctStock(f.context, f.change(12));
  const template = await InventoryMovement.findOne({ organizationId: f.context.organizationId }).lean();
  assert.ok(template);
  await InventoryMovement.insertMany(Array.from({ length: 21 }, (_, n) => ({
    ...template, _id: new Types.ObjectId(), type: "RECEIPT", previousQuantity: 0,
    newQuantity: 1, difference: 1, reason: "Sidprov", createdAt: new Date(Date.now() + 1000 + n),
  })));
  const foreign = await fixture();
  await correctStock(foreign.context, foreign.change(999));
  const first = await listHistory(f.context, {}), second = await listHistory(f.context, { page: 2 });
  assert.equal(first.total, 22);
  assert.equal(first.items.length, 20);
  assert.equal(second.items.length, 2);
  assert.equal(new Set([...first.items, ...second.items].map(row => row.id)).size, 22);
  assert.equal((await listHistory(f.context, { kind: "receipt", q: "sidprov", page: 2 })).items.length, 1);
  assert.equal((await listHistory(f.context, { q: ".*" })).total, 0);
  assert.equal((await listMovements(f.context, { q: ".*" })).total, 0);
  assert.equal((await listHistory(f.context, { page: 999 })).page, 2);
  await assert.rejects(listHistory({ ...f.context, role: "warehouse" }, {}), status(403));
  await assert.rejects(listHistory(f.context, { locationId: foreign.location.id }), status(404));
  await assert.rejects(listHistory(f.context, { q: { $ne: null } }));
  await assert.rejects(listHistory(f.context, { kind: "UNKNOWN" }));
});
test("history includes finished unchanged counts and combines inventory corrections without duplicate events", async () => {
  const f = await fixture();
  const second = await createLocation(f.context, { ...parts, position: "02", warehouseId: f.warehouse.id });
  await correctStock(f.context, f.change(12));
  const completedAt = new Date();
  const inventory = await InventorySession.create({
    organizationId: f.context.organizationId, warehouseId: f.warehouse.id, name: "Sluträkning",
    warehouseName: "Huvudlager", status: "completed", startedBy: f.context.userId, completedAt,
  });
  for (const place of [f.location, second]) await InventorySessionLocation.create({
    organizationId: f.context.organizationId, inventorySessionId: inventory._id,
    locationId: place.id, locationCode: place.code, status: "counted", completedAt, completedByName: "Räknare",
  });
  const template = await InventoryMovement.findOne({ organizationId: f.context.organizationId }).lean();
  assert.ok(template);
  await InventoryMovement.create({
    ...template, _id: new Types.ObjectId(), type: "INVENTORY", inventorySessionId: inventory._id,
    previousQuantity: 12, newQuantity: 9, difference: -3, reason: "Räknat antal",
  });
  const active = await InventorySession.create({
    organizationId: f.context.organizationId, warehouseId: f.warehouse.id, name: "Pågående",
    warehouseName: "Huvudlager", status: "active", startedBy: f.context.userId,
  });
  await InventorySessionLocation.create({
    organizationId: f.context.organizationId, inventorySessionId: active._id,
    locationId: f.location.id, locationCode: f.location.code, status: "counted", completedAt,
  });
  const history = await listHistory(f.context, { kind: "inventory" });
  assert.equal(history.total, 2);
  assert.equal(history.items.filter(row => row.balances.length === 1).length, 1);
  assert.equal(history.items.filter(row => row.balances.length === 0).length, 1);
  assert.ok(history.items.every(row => row.inventorySessionId === String(inventory._id)));
  assert.ok(history.items.every(row => row.difference === null));
  const searched = await listHistory(f.context, { kind: "inventory", q: productInput.sku });
  assert.equal(searched.total, 1);
  assert.equal(searched.items[0].balances[0].newQuantity, 9);
  const location = await listHistory(f.context, { kind: "inventory", locationId: second.id });
  assert.equal(location.total, 1);
  assert.equal(location.items[0].reason, "Sluträkning");
  const product = await listHistory(f.context, { kind: "inventory", productId: f.product.id });
  assert.equal(product.total, 1);
  assert.equal(product.items[0].difference, -3);
  assert.equal((await listMovements(f.context, {})).total, 2);
});
