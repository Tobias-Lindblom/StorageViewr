import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Types } from "mongoose";
import { connectDb } from "../src/lib/server/db";
import { AppError } from "../src/lib/server/errors";
import type { TenantContext } from "../src/lib/server/tenant";
import { Warehouse } from "../src/models/warehouse";
import { Location } from "../src/models/location";
import { createWarehouse, getWarehouse, listWarehouses, updateWarehouse } from "../src/features/warehouses/service";
import { createLocation, createLocationBatch, getLocation, getLocationByToken, listLocations, updateLocation } from "../src/features/locations/service";
import { getDashboard } from "../src/features/dashboard/service";
import { getLabels, locationQr } from "../src/features/locations/labels";
import { locationBatchSchema, locationSchema } from "../src/validation/location";
import { locationReturnPath } from "../src/validation/return-path";

let replica: MongoMemoryReplSet;
before(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = replica.getUri();
  process.env.MONGODB_DB = "storageviewr_warehouse_tests";
  process.env.APP_URL = "http://localhost:3000";
  await connectDb();
  for (const model of [Warehouse, Location]) { await model.createCollection(); await model.createIndexes(); }
});
after(async () => { await (await connectDb()).disconnect(); await replica?.stop(); });
const tenant = (): TenantContext => ({ userId: new Types.ObjectId(), organizationId: new Types.ObjectId(), role: "admin" });
const status = (expected: number) => (error: unknown) => error instanceof AppError && error.status === expected;
const warehouseInput = { name: "Borås lager", code: "BORAS", address: "Lagergatan 1" };
const parts = { zone: "A", shelf: "01", position: "01" };
const batchInput = { zone: "A", shelf: "01", startPosition: 1, count: 10 };

test("warehouses scope reads, writes, uniqueness and privileges to their organization", async () => {
  const a = tenant(), b = tenant();
  const own = await createWarehouse(a, warehouseInput);
  const foreign = await createWarehouse(b, warehouseInput);
  assert.deepEqual((await listWarehouses(a)).map(row => row.id), [own.id]);
  await assert.rejects(getWarehouse(a, foreign.id), status(404));
  await assert.rejects(updateWarehouse(a, foreign.id, { ...warehouseInput, name: "Intrång", active: true }), status(404));
  await assert.rejects(createWarehouse(a, { ...warehouseInput, code: " boras " }));
  await assert.rejects(createWarehouse(a, { ...warehouseInput, organizationId: b.organizationId.toString() }));
  await assert.rejects(createWarehouse({ ...a, role: "warehouse" }, { ...warehouseInput, code: "NEW" }), status(403));
  await assert.rejects(updateWarehouse({ ...a, role: "warehouse" }, own.id, { ...warehouseInput, active: false }), status(403));
  assert.equal((await getWarehouse(b, foreign.id)).name, warehouseInput.name);
});

test("location references, QR lookup, list and edit cannot cross tenant boundaries", async () => {
  const a = tenant(), b = tenant();
  const own = await createWarehouse(a, warehouseInput), foreign = await createWarehouse(b, warehouseInput);
  const location = await createLocation(a, { ...parts, warehouseId: own.id });
  const other = await createLocation(b, { ...parts, warehouseId: foreign.id });
  await assert.rejects(createLocation(a, { ...parts, warehouseId: foreign.id }), status(404));
  await assert.rejects(createLocationBatch(a, { ...batchInput, warehouseId: foreign.id }), status(404));
  await assert.rejects(getLocation(a, other.id), status(404));
  await assert.rejects(getLocationByToken(a, other.qrToken), status(404));
  await assert.rejects(updateLocation(a, other.id, { ...parts, active: false }), status(404));
  await assert.rejects(updateLocation(a, location.id, { ...parts, active: true, warehouseId: foreign.id }));
  assert.deepEqual((await listLocations(a)).map(row => row.id), [location.id]);
  assert.equal((await listLocations(a, foreign.id)).length, 0);
  assert.equal((await getLocationByToken(a, location.qrToken)).id, location.id);
  const labels = await getLabels(a);
  assert.deepEqual(labels.map(label => label.id), [location.id]);
  assert.equal(labels[0].url, "http://localhost:3000/location/" + location.qrToken);
  assert.ok(labels[0].image.startsWith("data:image/png;base64,"));
});

test("batch creation is atomic when a normalized code already exists", async () => {
  const a = tenant();
  const warehouse = await createWarehouse(a, warehouseInput);
  await createLocation(a, { warehouseId: warehouse.id, zone: "a", shelf: "1", position: "005" });
  await assert.rejects(createLocationBatch(a, { ...batchInput, warehouseId: warehouse.id }));
  const remaining = await listLocations(a);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].code, "A-01-05");
  const created = await createLocationBatch(a, { ...batchInput, warehouseId: warehouse.id, zone: "B" });
  assert.equal(created.length, 10);
  assert.equal(created[0].code, "B-01-01");
  assert.equal(created[9].code, "B-01-10");
  assert.equal(new Set(created.map(location => location.qrToken)).size, 10);
});

test("roles, stable QR tokens and inactive warehouse rules are enforced", async () => {
  const a = tenant(), worker: TenantContext = { ...a, role: "warehouse" };
  const warehouse = await createWarehouse(a, warehouseInput);
  const location = await createLocation(a, { warehouseId: warehouse.id, ...parts });
  await assert.rejects(createLocation(worker, { warehouseId: warehouse.id, ...parts, position: "02" }), status(403));
  await assert.rejects(createLocationBatch(worker, { warehouseId: warehouse.id, ...batchInput }), status(403));
  await assert.rejects(updateLocation(worker, location.id, { ...parts, active: false }), status(403));
  await assert.rejects(updateWarehouse(a, warehouse.id, { ...warehouseInput, active: false }), status(409));
  assert.equal((await getWarehouse(a, warehouse.id)).active, true);
  const edited = await updateLocation(a, location.id, { ...parts, position: "02", active: true });
  assert.equal(edited.qrToken, location.qrToken);
  assert.equal((await getLocationByToken(worker, location.qrToken)).code, "A-01-02");
  await updateLocation(a, location.id, { ...parts, position: "02", active: false });
  await assert.rejects(getLocationByToken(a, location.qrToken), status(404));
  assert.equal((await getLabels(a)).length, 0);
  assert.equal((await listLocations(worker)).length, 0);
  await updateWarehouse(a, warehouse.id, { ...warehouseInput, active: false });
  assert.equal((await listWarehouses(worker)).length, 0);
  await assert.rejects(createLocation(a, { warehouseId: warehouse.id, ...parts }), status(404));
  await updateWarehouse(a, warehouse.id, { ...warehouseInput, active: true });
  await updateLocation(a, location.id, { ...parts, active: true });
  assert.equal((await getLocationByToken(worker, location.qrToken)).code, "A-01-01");
});

test("concurrent warehouse deactivation and location creation cannot leave active locations in an inactive warehouse", async () => {
  const a = tenant();
  const warehouse = await createWarehouse(a, warehouseInput);
  const results = await Promise.allSettled([
    createLocation(a, { ...parts, warehouseId: warehouse.id }),
    updateWarehouse(a, warehouse.id, { ...warehouseInput, active: false }),
  ]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  const current = await getWarehouse(a, warehouse.id);
  const locations = await listLocations(a);
  assert.ok(current.active || locations.every(location => !location.active));
});

test("dashboard numbers reflect only real active data belonging to the current tenant", async () => {
  const a = tenant(), b = tenant();
  assert.deepEqual(await getDashboard(a), { warehouseCount: 0, locationCount: 0, warehouses: [] });
  const warehouse = await createWarehouse(a, warehouseInput);
  await createLocationBatch(a, { ...batchInput, warehouseId: warehouse.id });
  const foreign = await createWarehouse(b, warehouseInput);
  await createLocationBatch(b, { ...batchInput, warehouseId: foreign.id, count: 20 });
  const dashboard = await getDashboard(a);
  assert.equal(dashboard.warehouseCount, 1);
  assert.equal(dashboard.locationCount, 10);
  assert.equal(dashboard.warehouses[0].locationCount, 10);
});

test("validation blocks malformed references, unsafe batches and open redirects", async () => {
  const warehouseId = new Types.ObjectId().toString();
  for (const count of [0, -1, 101, NaN, Infinity, 1.5, "10"]) {
    assert.equal(locationBatchSchema.safeParse({ ...batchInput, warehouseId, count }).success, false);
  }
  assert.equal(locationBatchSchema.safeParse({ ...batchInput, warehouseId, startPosition: 995 }).success, false);
  assert.equal(locationSchema.safeParse({ ...parts, warehouseId: { $ne: null } }).success, false);
  assert.equal(locationSchema.safeParse({ ...parts, warehouseId, zone: "<script>" }).success, false);
  const safe = "/location/" + "a".repeat(48);
  assert.equal(locationReturnPath(safe), safe);
  for (const path of ["https://evil.example", "//evil.example", "/location/../settings", safe + "?next=evil", [safe]]) assert.equal(locationReturnPath(path), undefined);
  await assert.rejects(locationQr("invalid-token"));
});
