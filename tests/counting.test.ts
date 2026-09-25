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
import { InventorySession } from "../src/models/inventory-session";
import { InventorySessionLocation } from "../src/models/inventory-session-location";
import { InventoryCount } from "../src/models/inventory-count";
import { createProduct, updateProduct, getProduct } from "../src/features/products/service";
import { createWarehouse } from "../src/features/warehouses/service";
import { createLocation, updateLocation, getLocation } from "../src/features/locations/service";
import { adjustStock, getStockPair } from "../src/features/inventory/service";
import { startInventory, saveLocationCount, finishInventory } from "../src/features/inventory/sessions";
import { getInventory, listInventories } from "../src/features/inventory/session-queries";
import { startInventorySchema, saveCountSchema } from "../src/validation/inventory-session";

let replica: MongoMemoryReplSet;
before(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = replica.getUri();
  process.env.MONGODB_DB = "storageviewr_counting_tests";
  await connectDb();
  for (const model of [Product, ProductPhoto, Warehouse, Location, User, InventoryLevel, InventoryMovement, InventorySession, InventorySessionLocation, InventoryCount]) {
    await model.createCollection(); await model.createIndexes();
  }
});
after(async () => { await (await connectDb()).disconnect(); await replica?.stop(); });
const tenant = (): TenantContext => ({ userId: new Types.ObjectId(), organizationId: new Types.ObjectId(), role: "admin" });
const status = (expected: number) => (error: unknown) => error instanceof AppError && error.status === expected;
const productInput = { name: "Arbetshandske", sku: "GLOVE-01" };
const parts = { zone: "A", shelf: "01", position: "01" };
async function fixture(quantity?: number) {
  const context = tenant();
  const product = await createProduct(context, productInput);
  const warehouse = await createWarehouse(context, { name: "Huvudlager", code: "MAIN" });
  const location = await createLocation(context, { ...parts, warehouseId: warehouse.id });
  const empty = await createLocation(context, { ...parts, position: "02", warehouseId: warehouse.id });
  const pair = { productId: product.id, locationId: location.id };
  if (quantity !== undefined) await adjustStock(context, { ...pair, quantity, expectedVersion: null, reason: "Inleverans" });
  const inventory = await startInventory(context, { name: "September", warehouseId: warehouse.id, locationIds: [location.id, empty.id] });
  const count = (countedQuantity: number, expectedVersion: number | null = quantity === undefined ? null : 1, expectedRevision = 0) =>
    ({ expectedRevision, confirmComplete: true, confirmReplace: expectedRevision > 0, rows: [{ productId: product.id, expectedVersion, countedQuantity }] });
  const blank = { expectedRevision: 0, confirmComplete: true, rows: [] };
  return { context, product, warehouse, location, empty, pair, inventory, count, blank };
}
async function finish(f: Awaited<ReturnType<typeof fixture>>) {
  const detail = await getInventory(f.context, f.inventory.id);
  return finishInventory(f.context, f.inventory.id, { expectedRevision: detail.revision, confirmed: true });
}

test("counting freezes location scope, tracks empty places, preserves stock until completion and saves snapshots", async () => {
  const f = await fixture(10);
  await User.create({ _id: f.context.userId, name: "Anna Lager", email: f.context.userId + "@test.example", passwordHash: "unused" });
  await createLocation(f.context, { ...parts, position: "03", warehouseId: f.warehouse.id });
  await saveLocationCount(f.context, f.inventory.id, f.location.id, f.count(8));
  assert.equal((await getStockPair(f.context, f.pair)).quantity, 10);
  assert.equal((await getInventory(f.context, f.inventory.id)).places.length, 2);
  await assert.rejects(finish(f), status(409));
  await saveLocationCount(f.context, f.inventory.id, f.empty.id, f.blank);
  const reviewed = await getInventory(f.context, f.inventory.id);
  assert.equal(reviewed.counted, 2); assert.equal(reviewed.discrepancies[0].difference, -2);
  assert.equal(reviewed.discrepancies[0].expectedQuantity, 10);
  await finish(f);
  assert.equal((await getStockPair(f.context, f.pair)).quantity, 8);
  assert.equal((await getStockPair(f.context, f.pair)).version, 2);
  const history = await InventoryMovement.findOne({ inventorySessionId: f.inventory.id }).lean();
  assert.equal(history?.type, "INVENTORY"); assert.equal(history?.performedByName, "Anna Lager");
  assert.equal(history?.previousQuantity, 10); assert.equal(history?.newQuantity, 8);
  const done = await getInventory(f.context, f.inventory.id);
  assert.equal(done.status, "completed"); assert.equal(done.discrepancies[0].expectedQuantity, 10);
  assert.equal(done.discrepancies[0].countedByName, "Anna Lager");
  await assert.rejects(saveLocationCount(f.context, f.inventory.id, f.location.id, f.count(7, 2, 1)), status(409));
});

test("organization and warehouse references remain isolated for all inventory operations", async () => {
  const a = await fixture(3), b = await fixture(9);
  await assert.rejects(getInventory(a.context, b.inventory.id), status(404));
  await assert.rejects(startInventory(a.context, { name: "Fel lager", warehouseId: b.warehouse.id, locationIds: [b.location.id] }), status(404));
  await assert.rejects(startInventory(a.context, { name: "Fel plats", warehouseId: a.warehouse.id, locationIds: [b.location.id] }), status(400));
  await assert.rejects(saveLocationCount(a.context, b.inventory.id, b.location.id, b.count(1)), status(404));
  await assert.rejects(saveLocationCount(a.context, a.inventory.id, b.location.id, b.blank), status(404));
  await assert.rejects(saveLocationCount(a.context, a.inventory.id, a.location.id, { ...a.count(1), rows: [{ productId: b.product.id, expectedVersion: null, countedQuantity: 1 }] }), status(400));
  await assert.rejects(finishInventory(a.context, b.inventory.id, { expectedRevision: 0, confirmed: true }), status(404));
  const otherWarehouse = await createWarehouse(a.context, { name: "Annat", code: "OTHER" });
  const otherPlace = await createLocation(a.context, { ...parts, warehouseId: otherWarehouse.id });
  await assert.rejects(startInventory(a.context, { name: "Fel omfattning", warehouseId: a.warehouse.id, locationIds: [otherPlace.id] }), status(400));
  assert.equal((await listInventories(a.context)).items.length, 1);
});

test("warehouse users can count but only administrators can start and finish", async () => {
  const f = await fixture(3), worker: TenantContext = { ...f.context, role: "warehouse" };
  await assert.rejects(startInventory(worker, { name: "Otillåten", warehouseId: f.warehouse.id, locationIds: [f.location.id] }), status(403));
  await saveLocationCount(worker, f.inventory.id, f.location.id, f.count(3));
  await saveLocationCount(worker, f.inventory.id, f.empty.id, f.blank);
  assert.equal((await getInventory(worker, f.inventory.id)).counted, 2);
  await assert.rejects(finishInventory(worker, f.inventory.id, { expectedRevision: 2, confirmed: true }), status(403));
  await finish(f);
  assert.equal(await InventoryMovement.countDocuments({ inventorySessionId: f.inventory.id }), 0);
});

test("stale versions reject counting and recount requires explicit confirmation and its own revision", async () => {
  const f = await fixture(10);
  await adjustStock(f.context, { ...f.pair, quantity: 11, expectedVersion: 1, reason: "Leverans" });
  await assert.rejects(saveLocationCount(f.context, f.inventory.id, f.location.id, f.count(8)), status(409));
  assert.equal(await InventoryCount.countDocuments({ inventorySessionId: f.inventory.id }), 0);
  await saveLocationCount(f.context, f.inventory.id, f.location.id, f.count(8, 2));
  await assert.rejects(saveLocationCount(f.context, f.inventory.id, f.location.id, { ...f.count(9, 2, 1), confirmReplace: false }), status(409));
  const results = await Promise.allSettled([
    saveLocationCount(f.context, f.inventory.id, f.location.id, f.count(9, 2, 1)),
    saveLocationCount(f.context, f.inventory.id, f.location.id, f.count(7, 2, 1)),
  ]);
  assert.equal(results.filter(row => row.status === "fulfilled").length, 1);
  assert.equal(await InventoryCount.countDocuments({ inventorySessionId: f.inventory.id }), 1);
  assert.equal((await getInventory(f.context, f.inventory.id)).places[0].rows[0].expectedQuantity, 11);
});

test("changes after review block completion until recounted, including new products on an empty place", async () => {
  const f = await fixture(10);
  await saveLocationCount(f.context, f.inventory.id, f.location.id, f.count(8));
  await saveLocationCount(f.context, f.inventory.id, f.empty.id, f.blank);
  const review = await getInventory(f.context, f.inventory.id);
  await saveLocationCount(f.context, f.inventory.id, f.location.id, f.count(9, 1, 1));
  await assert.rejects(finishInventory(f.context, f.inventory.id, { expectedRevision: review.revision, confirmed: true }), status(409));
  await adjustStock(f.context, { ...f.pair, quantity: 12, expectedVersion: 1, reason: "Leverans" });
  await assert.rejects(finish(f), status(409));
  assert.equal((await getInventory(f.context, f.inventory.id)).places[0].stale, true);
  await saveLocationCount(f.context, f.inventory.id, f.location.id, f.count(9, 2, 2));
  await adjustStock(f.context, { ...f.pair, locationId: f.empty.id, quantity: 4, expectedVersion: null, reason: "Ny placering" });
  await assert.rejects(finish(f), status(409));
  assert.equal((await getInventory(f.context, f.inventory.id)).places[1].stale, true);
  await saveLocationCount(f.context, f.inventory.id, f.empty.id, { ...f.count(4, 1, 1) });
  await finish(f);
});

test("concurrent and repeated completion creates each movement once, including after deactivation", async () => {
  const f = await fixture(10);
  await saveLocationCount(f.context, f.inventory.id, f.location.id, f.count(0));
  await saveLocationCount(f.context, f.inventory.id, f.empty.id, f.blank);
  const review = await getInventory(f.context, f.inventory.id);
  const input = { expectedRevision: review.revision, confirmed: true };
  await Promise.all([finishInventory(f.context, f.inventory.id, input), finishInventory(f.context, f.inventory.id, input)]);
  await updateProduct(f.context, f.product.id, { ...productInput, active: false });
  await updateLocation(f.context, f.location.id, { ...parts, active: false });
  await finishInventory(f.context, f.inventory.id, input);
  assert.equal(await InventoryMovement.countDocuments({ inventorySessionId: f.inventory.id }), 1);
  assert.equal((await getStockPair(f.context, f.pair)).version, 2);
});

test("movement failure rolls back all balances and completion state", async () => {
  const f = await fixture(10);
  await saveLocationCount(f.context, f.inventory.id, f.location.id, f.count(8));
  await saveLocationCount(f.context, f.inventory.id, f.empty.id, f.count(3, null));
  const original = InventoryMovement.create.bind(InventoryMovement);
  let writes = 0;
  const failure = mock.method(InventoryMovement, "create", async (...args: Parameters<typeof InventoryMovement.create>) => {
    if (++writes === 2) throw new Error("Injected completion failure");
    return original(...args);
  });
  try { await assert.rejects(finish(f), /Injected completion failure/); }
  finally { failure.mock.restore(); }
  assert.equal((await getStockPair(f.context, f.pair)).quantity, 10);
  assert.equal((await getStockPair(f.context, { ...f.pair, locationId: f.empty.id })).version, null);
  assert.equal((await getInventory(f.context, f.inventory.id)).status, "active");
  assert.equal(await InventoryMovement.countDocuments({ inventorySessionId: f.inventory.id }), 0);
  await finish(f);
  assert.equal(await InventoryMovement.countDocuments({ inventorySessionId: f.inventory.id }), 2);
});

test("open inventories prevent deactivating empty places, zero balances and newly found counted products", async () => {
  const f = await fixture(0);
  await assert.rejects(updateLocation(f.context, f.empty.id, { ...parts, position: "02", active: false }), status(409));
  await assert.rejects(updateProduct(f.context, f.product.id, { ...productInput, active: false }), status(409));
  const extra = await createProduct(f.context, { name: "Ny produkt", sku: "EXTRA" });
  await saveLocationCount(f.context, f.inventory.id, f.empty.id, { ...f.blank, rows: [{ productId: extra.id, expectedVersion: null, countedQuantity: 0 }] });
  await assert.rejects(updateProduct(f.context, extra.id, { name: "Ny produkt", sku: "EXTRA", active: false }), status(409));
  await saveLocationCount(f.context, f.inventory.id, f.location.id, f.count(0));
  await finish(f);
  await updateProduct(f.context, extra.id, { name: "Ny produkt", sku: "EXTRA", active: false });
});

test("counting versus product deactivation never leaves an inactive product in an open count", async () => {
  const f = await fixture();
  const results = await Promise.allSettled([
    saveLocationCount(f.context, f.inventory.id, f.location.id, f.count(2)),
    updateProduct(f.context, f.product.id, { ...productInput, active: false }),
  ]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  const product = await getProduct(f.context, f.product.id);
  assert.ok(product.active || !(await InventoryCount.exists({ inventorySessionId: f.inventory.id, productId: f.product.id })));
  assert.equal((await getLocation(f.context, f.location.id)).active, true);
});

test("completion racing a stock adjustment either commits consistently or rejects the stale writer", async () => {
  const f = await fixture(10);
  await saveLocationCount(f.context, f.inventory.id, f.location.id, f.count(8));
  await saveLocationCount(f.context, f.inventory.id, f.empty.id, f.blank);
  const outcomes = await Promise.allSettled([
    finish(f), adjustStock(f.context, { ...f.pair, quantity: 15, expectedVersion: 1, reason: "Samtidig ändring" }),
  ]);
  assert.equal(outcomes.filter(row => row.status === "fulfilled").length, 1);
  const inventory = await getInventory(f.context, f.inventory.id);
  assert.equal((await getStockPair(f.context, f.pair)).quantity, inventory.status === "completed" ? 8 : 15);
});

test("validation rejects duplicate scope, duplicate products, unsafe counts and unconfirmed saves", () => {
  const id = String(new Types.ObjectId());
  assert.equal(startInventorySchema.safeParse({ name: "Test", warehouseId: id, locationIds: [id, id] }).success, false);
  const row = { productId: id, expectedVersion: null, countedQuantity: 0 };
  const input = { expectedRevision: 0, confirmComplete: true, rows: [row] };
  for (const quantity of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, "3"]) {
    assert.equal(saveCountSchema.safeParse({ ...input, rows: [{ ...row, countedQuantity: quantity }] }).success, false);
  }
  assert.equal(saveCountSchema.safeParse({ ...input, rows: [row, row] }).success, false);
  assert.equal(saveCountSchema.safeParse({ ...input, confirmComplete: false }).success, false);
  assert.equal(saveCountSchema.safeParse({ ...input, organizationId: id }).success, false);
});

test("scope creation racing location deactivation cannot freeze an inactive place", async () => {
  const context = tenant();
  const warehouse = await createWarehouse(context, { name: "Lager", code: "MAIN" });
  const location = await createLocation(context, { ...parts, warehouseId: warehouse.id });
  const outcomes = await Promise.allSettled([
    startInventory(context, { name: "Samtidig start", warehouseId: warehouse.id, locationIds: [location.id] }),
    updateLocation(context, location.id, { ...parts, active: false }),
  ]);
  assert.equal(outcomes.filter(row => row.status === "fulfilled").length, 1);
  const place = await getLocation(context, location.id);
  assert.ok(place.active || !(await InventorySessionLocation.exists({ organizationId: context.organizationId, locationId: location.id })));
});

test("ObjectId casing is normalized before counting and duplicate validation", async () => {
  const f = await fixture(5);
  await saveLocationCount(f.context, f.inventory.id, f.location.id, {
    ...f.count(4), rows: [{ productId: f.product.id.toUpperCase(), expectedVersion: 1, countedQuantity: 4 }],
  });
  assert.equal((await getInventory(f.context, f.inventory.id)).discrepancies[0].difference, -1);
  assert.equal(startInventorySchema.safeParse({
    name: "Dubblett", warehouseId: f.warehouse.id, locationIds: [f.location.id, f.location.id.toUpperCase()],
  }).success, false);
});

test("QR scans resolve only active scoped places and manual codes normalize within the selected warehouse", async () => {
  process.env.APP_URL = "https://storageviewr.example";
  const { resolveInventoryLocation, inventoriesForLocation } = await import("../src/features/scanner/service");
  const f = await fixture(5), other = await fixture(9);
  const worker: TenantContext = { ...f.context, role: "warehouse" };
  const qr = process.env.APP_URL + "/location/" + f.location.qrToken;
  const resolved = await resolveInventoryLocation(worker, f.inventory.id, { qr });
  assert.equal(resolved.locationId, f.location.id);
  assert.equal(resolved.inventory.places[0].rows[0].currentQuantity, 5);
  assert.equal((await resolveInventoryLocation(worker, f.inventory.id, { code: " a-1-1 " })).locationId, f.location.id);
  await assert.rejects(resolveInventoryLocation(f.context, f.inventory.id, { qr: process.env.APP_URL + "/location/" + other.location.qrToken }), status(404));
  await assert.rejects(resolveInventoryLocation(other.context, f.inventory.id, { qr }), status(404));
  const outside = await createLocation(f.context, { ...parts, position: "03", warehouseId: f.warehouse.id });
  await assert.rejects(resolveInventoryLocation(f.context, f.inventory.id, { qr: process.env.APP_URL + "/location/" + outside.qrToken }), status(404));
  await assert.rejects(resolveInventoryLocation(f.context, f.inventory.id, { code: "A-01-03" }), status(404));
  const secondWarehouse = await createWarehouse(f.context, { name: "Annat lager", code: "SECOND" });
  const sameCode = await createLocation(f.context, { ...parts, warehouseId: secondWarehouse.id });
  await assert.rejects(resolveInventoryLocation(f.context, f.inventory.id, { qr: process.env.APP_URL + "/location/" + sameCode.qrToken }), status(404));
  assert.equal((await inventoriesForLocation(f.context, f.location.id)).length, 1);
  await startInventory(f.context, { name: "Parallell inventering", warehouseId: f.warehouse.id, locationIds: [f.location.id] });
  assert.equal((await inventoriesForLocation(f.context, f.location.id)).length, 2);
  await assert.rejects(inventoriesForLocation(other.context, f.location.id), status(404));
  await saveLocationCount(f.context, f.inventory.id, f.location.id, f.count(5));
  await saveLocationCount(f.context, f.inventory.id, f.empty.id, f.blank);
  await finish(f);
  await assert.rejects(resolveInventoryLocation(f.context, f.inventory.id, { qr }), status(409));
  assert.equal((await inventoriesForLocation(f.context, f.location.id)).length, 1);
});

test("QR parsing rejects arbitrary destinations, malformed tokens and ambiguous requests", async () => {
  process.env.APP_URL = "https://storageviewr.example";
  const { readLocationToken } = await import("../src/features/scanner/service");
  const { scanLocationSchema } = await import("../src/validation/scan");
  const token = "a".repeat(48);
  assert.equal(readLocationToken("/location/" + token), token);
  assert.equal(readLocationToken(process.env.APP_URL + "/location/" + token), token);
  for (const qr of ["javascript:alert(1)", "https://evil.example/location/" + token,
    "//evil.example/location/" + token, "/products/" + token, "/location/short", "/location/" + token + "?next=https://evil.example",
    "/location/" + token + "#anything", "https://user:secret@storageviewr.example/location/" + token]) {
    assert.throws(() => readLocationToken(qr), status(400));
  }
  for (const input of [{ qr: "/location/" + token, code: "A-01-01" }, { code: { $ne: null } }, { code: "A-00-01" },
    { qr: "x".repeat(2049) }, { qr: "/location/" + token, organizationId: String(new Types.ObjectId()) }]) {
    assert.equal(scanLocationSchema.safeParse(input).success, false);
  }
});

test("inventory lists separate active and completed sessions without losing place counts", async () => {
  const f = await fixture(3);
  await saveLocationCount(f.context, f.inventory.id, f.location.id, f.count(3));
  let active = await listInventories(f.context, 1, "active");
  assert.equal(active.items.length, 1);
  assert.equal(active.items[0].total, 2);
  assert.equal(active.items[0].counted, 1);
  assert.equal((await listInventories(f.context, 1, "completed")).items.length, 0);
  await saveLocationCount(f.context, f.inventory.id, f.empty.id, f.blank);
  await finish(f);
  active = await listInventories(f.context, 1, "active");
  assert.equal(active.items.length, 0);
  const completed = await listInventories({ ...f.context, role: "warehouse" }, 1, "completed");
  assert.equal(completed.items.length, 1);
  assert.equal(completed.items[0].id, f.inventory.id);
  assert.equal(completed.items[0].total, 2);
  assert.equal(completed.items[0].counted, 2);
  assert.ok(completed.items[0].completedAt);
  assert.equal((await listInventories(tenant(), 1, "completed")).items.length, 0);
  await assert.rejects(listInventories(f.context, 1, "invalid"));
});

test("inventory pagination filters before counting and sorts completed sessions by completion date", async () => {
  const context = tenant();
  const warehouseId = new Types.ObjectId();
  const rows = Array.from({ length: 21 }, (_, index) => ({
    organizationId: context.organizationId,
    warehouseId,
    warehouseName: "Testlager",
    startedBy: context.userId,
    name: "Genomförd " + index,
    status: "completed",
    startedAt: new Date(Date.UTC(2020, 0, 22 - index)),
    completedAt: new Date(Date.UTC(2020, 1, index + 1)),
  }));
  await InventorySession.insertMany([
    ...rows,
    ...Array.from({ length: 21 }, (_, index) => ({
      ...rows[index],
      name: "Pågående " + index,
      status: "active",
      completedAt: undefined,
    })),
    { ...rows[0], organizationId: new Types.ObjectId(), name: "Annat företag" },
  ]);
  for (const status of ["active", "completed"] as const) {
    const first = await listInventories(context, 1, status);
    const last = await listInventories(context, 100, status);
    assert.equal(first.pages, 2);
    assert.equal(first.items.length, 20);
    assert.equal(last.page, 2);
    assert.equal(last.items.length, 1);
    assert.ok([...first.items, ...last.items].every(item => item.status === status));
    assert.equal(new Set([...first.items, ...last.items].map(item => item.id)).size, 21);
    if (status === "completed") {
      assert.equal(first.items[0].name, "Genomförd 20");
      assert.equal(last.items[0].name, "Genomförd 0");
    }
  }
  assert.equal((await listInventories(context)).pages, 3);
});
