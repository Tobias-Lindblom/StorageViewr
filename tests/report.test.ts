import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { connectDb } from "../src/lib/server/db";
import { AppError } from "../src/lib/server/errors";
import { Organization } from "../src/models/organization";
import { User } from "../src/models/user";
import { Product } from "../src/models/product";
import { Warehouse } from "../src/models/warehouse";
import { Location } from "../src/models/location";
import { InventoryLevel } from "../src/models/inventory-level";
import { InventoryMovement } from "../src/models/inventory-movement";
import { InventorySession } from "../src/models/inventory-session";
import { InventorySessionLocation } from "../src/models/inventory-session-location";
import { InventoryCount } from "../src/models/inventory-count";
import { InventoryDiscrepancy } from "../src/models/inventory-discrepancy";
import { createProduct } from "../src/features/products/service";
import { createWarehouse } from "../src/features/warehouses/service";
import { createLocation } from "../src/features/locations/service";
import { adjustStock } from "../src/features/inventory/service";
import {
  startInventory,
  saveLocationCount,
  finishInventory,
} from "../src/features/inventory/sessions";
import { getInventory } from "../src/features/inventory/session-queries";
import {
  getInventoryReport,
  type InventoryReport,
} from "../src/features/inventory/report-data";
import {
  renderInventoryReport,
  inventoryReportFilename,
} from "../src/features/inventory/report-pdf";
import {
  getLocationStockReport,
  type LocationStockReport,
} from "../src/features/locations/report-data";
import {
  locationStockReportFilename,
  renderLocationStockReport,
} from "../src/features/locations/report-pdf";
import type { TenantContext } from "../src/lib/server/tenant";
import { getDiscrepancyReport, getHealthReport } from "../src/features/reports/operational-report-data";
import { renderDiscrepancyReport, renderHealthReport } from "../src/features/reports/operational-report-pdf";

let replica: MongoMemoryReplSet;
const folder = path.join(tmpdir(), "storageviewr-pdf-verification");
before(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = replica.getUri();
  process.env.MONGODB_DB = "storageviewr_report_tests";
  await connectDb();
  await mkdir(folder, { recursive: true });
  for (const model of [
    Organization,
    User,
    Product,
    Warehouse,
    Location,
    InventoryLevel,
    InventoryMovement,
    InventorySession,
    InventorySessionLocation,
    InventoryCount,
    InventoryDiscrepancy,
  ]) {
    await model.createCollection();
    await model.createIndexes();
  }
});

test("discrepancy and health reports use tenant data and render valid PDFs", async () => {
  const f = await fixture();
  await f.complete(8);
  const discrepancies = await getDiscrepancyReport(f.context);
  assert.equal(discrepancies.summary.total, 1);
  assert.equal(discrepancies.rows[0].difference, -2);
  assert.equal(discrepancies.rows[0].unitValue, "0.8451");
  assert.equal(discrepancies.rows[0].valueDifferenceUnits, "-16902");
  const health = await getHealthReport(f.context);
  assert.equal(health.health.score, 100);
  const [discrepancyPdf, healthPdf] = await Promise.all([
    renderDiscrepancyReport(discrepancies),
    renderHealthReport(health),
  ]);
  assert.equal(discrepancyPdf.subarray(0, 4).toString(), "%PDF");
  assert.equal(healthPdf.subarray(0, 4).toString(), "%PDF");
  await assert.rejects(getDiscrepancyReport({ ...f.context, organizationId: new Types.ObjectId() }), status(404));
});
after(async () => {
  await (await connectDb()).disconnect();
  await replica?.stop();
});
const status = (code: number) => (error: unknown) =>
  error instanceof AppError && error.status === code;
async function fixture(quantity = 10) {
  const context: TenantContext = {
    organizationId: new Types.ObjectId(),
    userId: new Types.ObjectId(),
    role: "admin",
  };
  await Organization.create({
    _id: context.organizationId,
    name: "Åström Lager AB",
    slug: String(context.organizationId),
    organizationNumber: "556016-0680",
    addressLine1: "Lagergatan 12",
    postalCode: "123 45",
    city: "Stockholm",
    country: "Sverige",
    contactEmail: "info@astrom.example",
  });
  await User.create({
    _id: context.userId,
    name: "Tobias Åström",
    email: context.userId + "@example.test",
    passwordHash: "unused",
  });
  const product = await createProduct(context, {
    name: "Arbetshandske – förstärkt",
    sku: "HANDSKE-01",
    unitValue: "0.8451",
  });
  const warehouse = await createWarehouse(context, {
    name: "Huvudlager Borås",
    code: "MAIN",
  });
  const location = await createLocation(context, {
    warehouseId: warehouse.id,
    zone: "A",
    shelf: "01",
    position: "01",
  });
  const empty = await createLocation(context, {
    warehouseId: warehouse.id,
    zone: "A",
    shelf: "01",
    position: "02",
  });
  const pair = { productId: product.id, locationId: location.id };
  await adjustStock(context, {
    ...pair,
    quantity,
    expectedVersion: null,
    reason: "Inleverans",
  });
  const inventory = await startInventory(context, {
    name: "Septemberinventering 2026",
    warehouseId: warehouse.id,
    locationIds: [location.id, empty.id],
  });
  async function complete(counted = 8) {
    await saveLocationCount(context, inventory.id, location.id, {
      expectedRevision: 0,
      confirmComplete: true,
      rows: [
        { productId: product.id, expectedVersion: 1, countedQuantity: counted },
      ],
    });
    await saveLocationCount(context, inventory.id, empty.id, {
      expectedRevision: 0,
      confirmComplete: true,
      rows: [],
    });
    const detail = await getInventory(context, inventory.id);
    await finishInventory(context, inventory.id, {
      expectedRevision: detail.revision,
      confirmed: true,
    });
  }
  return {
    context,
    product,
    warehouse,
    location,
    empty,
    pair,
    inventory,
    complete,
  };
}

test("reports require completion and tenant ownership and use immutable counting data after later changes", async () => {
  const f = await fixture();
  await assert.rejects(
    getInventoryReport(f.context, f.inventory.id),
    status(409),
  );
  await f.complete();
  const original = await getInventoryReport(f.context, f.inventory.id);
  assert.equal(original.companyName, "Åström Lager AB");
  assert.equal(original.companyDetails.organizationNumber, "556016-0680");
  assert.equal(original.companyDetails.city, "Stockholm");
  assert.equal(original.startedBy, "Tobias Åström");
  assert.equal(original.completedBy, "Tobias Åström");
  assert.equal(original.summary.discrepancies, 1);
  assert.equal(original.summary.emptyPlaces, 1);
  assert.equal(original.summary.expected, "10");
  assert.equal(original.summary.counted, "8");
  assert.equal(original.summary.shortage, "-2");
  assert.equal(original.summary.surplus, "0");
  assert.equal(original.places[0].rows[0].unitValue, "0.8451");
  assert.equal(original.places[0].rows[0].expectedValueUnits, "84510");
  assert.equal(original.places[0].rows[0].countedValueUnits, "67608");
  assert.equal(original.places[0].rows[0].valueDifferenceUnits, "-16902");
  assert.equal(original.summary.expectedValueUnits, "84510");
  assert.equal(original.summary.countedValueUnits, "67608");
  assert.equal(original.summary.valueDifferenceUnits, "-16902");
  assert.equal(original.summary.productsWithoutValue, 0);
  await adjustStock(f.context, {
    ...f.pair,
    quantity: 777,
    expectedVersion: 2,
    reason: "Senare leverans",
  });
  await Product.updateOne(
    { _id: f.product.id },
    { $set: { name: "Nytt produktnamn", active: false, unitValue: "99.0000" } },
  );
  await Location.updateOne(
    { _id: f.location.id },
    { $set: { code: "B-01-01", active: false } },
  );
  await Warehouse.updateOne(
    { _id: f.warehouse.id },
    { $set: { name: "Nytt lager", active: false } },
  );
  await Organization.updateOne(
    { _id: f.context.organizationId },
    {
      $set: {
        name: "Nytt företagsnamn",
        organizationNumber: "556677-8899",
        addressLine1: "Ny adress 99",
      },
    },
  );
  await User.updateOne(
    { _id: f.context.userId },
    { $set: { name: "Nytt användarnamn" } },
  );
  assert.deepEqual(
    await getInventoryReport(f.context, f.inventory.id),
    original,
  );
  assert.deepEqual(
    await getInventoryReport(
      { ...f.context, role: "warehouse" },
      f.inventory.id,
    ),
    original,
  );
  await assert.rejects(
    getInventoryReport(
      { ...f.context, organizationId: new Types.ObjectId() },
      f.inventory.id,
    ),
    status(404),
  );
  await writeFile(
    path.join(folder, "short.pdf"),
    await renderInventoryReport(original),
  );
  await writeFile(path.join(folder, "short.json"), JSON.stringify(original));
});

test("location stock reports include zero-balance placements, empty places and current product balances", async () => {
  const f = await fixture();
  const vacant = await createLocation(f.context, {
    warehouseId: f.warehouse.id,
    zone: "A",
    shelf: "01",
    position: "03",
  });
  const zeroProduct = await createProduct(f.context, {
    name: "Skyddsglasögon",
    sku: "GLAS-01",
  });
  await InventoryLevel.create({
    organizationId: f.context.organizationId,
    warehouseId: f.warehouse.id,
    productId: zeroProduct.id,
    locationId: f.empty.id,
    quantity: 0,
    version: 1,
  });

  const report = await getLocationStockReport(f.context, f.warehouse.id);
  assert.equal(report.companyName, "Åström Lager AB");
  assert.equal(report.companyDetails.addressLine1, "Lagergatan 12");
  assert.equal(report.companyDetails.contactEmail, "info@astrom.example");
  assert.equal(report.scopeName, "Huvudlager Borås");
  assert.deepEqual(report.summary, {
    warehouses: 1,
    locations: 3,
    emptyLocations: 1,
    uniqueProducts: 2,
    totalQuantity: "10",
    productsWithoutValue: 1,
    inventoryValueUnits: "84510",
  });
  assert.equal(report.warehouses[0].locations[0].rows[0].quantity, 10);
  assert.equal(report.warehouses[0].locations[0].rows[0].unitValue, "0.8451");
  assert.equal(
    report.warehouses[0].locations[0].rows[0].totalValueUnits,
    "84510",
  );
  assert.equal(report.warehouses[0].locations[1].rows[0].quantity, 0);
  assert.equal(report.warehouses[0].locations[1].rows[0].unitValue, null);
  assert.equal(report.warehouses[0].locations[1].rows[0].totalValueUnits, null);
  assert.equal(report.warehouses[0].locations[2].id, vacant.id);
  assert.equal(report.warehouses[0].locations[2].rows.length, 0);

  const foreignContext: TenantContext = {
    organizationId: new Types.ObjectId(),
    userId: new Types.ObjectId(),
    role: "admin",
  };
  await Organization.create({
    _id: foreignContext.organizationId,
    name: "Annat företag",
    slug: String(foreignContext.organizationId),
  });
  await assert.rejects(
    getLocationStockReport(foreignContext, f.warehouse.id),
    status(404),
  );

  const locations = Array.from({ length: 36 }, (_, index) => ({
    ...report.warehouses[0].locations[index % 2],
    id: String(new Types.ObjectId()),
    code: "A-" + String(index + 1).padStart(3, "0"),
  }));
  const multiPage: LocationStockReport = {
    ...report,
    warehouses: [{ ...report.warehouses[0], locations }],
    summary: { ...report.summary, locations: locations.length },
  };
  const bytes = await renderLocationStockReport(multiPage);
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  const pageCount = (bytes.toString("latin1").match(/\/Type \/Page\b/g) ?? [])
    .length;
  assert.ok(pageCount > 1);
  assert.ok(pageCount <= 2);
  assert.match(
    locationStockReportFilename({
      ...report,
      scopeName: 'Å-lager / "test"\r\nHeader',
    }),
    /^lagervardesrapport-[a-z0-9-]+\.pdf$/,
  );
  await writeFile(path.join(folder, "location-stock.pdf"), bytes);
  await writeFile(
    path.join(folder, "location-stock.json"),
    JSON.stringify(report),
  );
});

test("reports retain unchanged rows, empty places and exact totals beyond safe integer sums", async () => {
  const f = await fixture(Number.MAX_SAFE_INTEGER);
  const extra = await createProduct(f.context, {
    name: "Skruv M8",
    sku: "SKRUV-01",
  });
  await adjustStock(f.context, {
    productId: extra.id,
    locationId: f.location.id,
    quantity: Number.MAX_SAFE_INTEGER,
    expectedVersion: null,
    reason: "Inleverans",
  });
  await saveLocationCount(f.context, f.inventory.id, f.location.id, {
    expectedRevision: 0,
    confirmComplete: true,
    rows: [f.product.id, extra.id].map((productId) => ({
      productId,
      expectedVersion: 1,
      countedQuantity: Number.MAX_SAFE_INTEGER,
    })),
  });
  await saveLocationCount(f.context, f.inventory.id, f.empty.id, {
    expectedRevision: 0,
    confirmComplete: true,
    rows: [],
  });
  const detail = await getInventory(f.context, f.inventory.id);
  await finishInventory(f.context, f.inventory.id, {
    expectedRevision: detail.revision,
    confirmed: true,
  });
  const report = await getInventoryReport(f.context, f.inventory.id);
  assert.equal(
    report.summary.expected,
    (BigInt(Number.MAX_SAFE_INTEGER) * BigInt(2)).toString(),
  );
  assert.equal(report.summary.counted, report.summary.expected);
  assert.equal(report.summary.difference, "0");
  assert.equal(report.summary.rows, 2);
  assert.equal(report.summary.discrepancies, 0);
  await writeFile(
    path.join(folder, "large-numbers.pdf"),
    await renderInventoryReport(report),
  );
  await writeFile(
    path.join(folder, "large-numbers.json"),
    JSON.stringify(report),
  );
});

test("legacy sessions remain downloadable without inventing missing historical names", async () => {
  const f = await fixture();
  await f.complete(10);
  await InventorySession.collection.updateOne(
    { _id: new Types.ObjectId(f.inventory.id) },
    {
      $unset: {
        organizationName: "",
        organizationDetails: "",
        startedByName: "",
        completedByName: "",
      },
    },
  );
  const report = await getInventoryReport(f.context, f.inventory.id);
  assert.equal(report.companyName, "Åström Lager AB");
  assert.equal(report.currentCompanyName, true);
  assert.equal(report.startedBy, "Ej sparat");
  assert.equal(report.completedBy, "Ej sparat");
  const bytes = await renderInventoryReport(report);
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  await writeFile(path.join(folder, "legacy.pdf"), bytes);
});

test("multi-page PDFs include long names and safe filenames without truncating inventory rows", async () => {
  const f = await fixture();
  await f.complete();
  const original = await getInventoryReport(f.context, f.inventory.id);
  const rows = Array.from({ length: 65 }, (_, index) => {
    const expected = 100 + index;
    const counted = 98 + index;
    const valueUnits = BigInt(8451);
    return {
      ...original.places[0].rows[0],
      productId: String(new Types.ObjectId()),
      sku: "ART-" + String(index).padStart(3, "0"),
      name:
        "Produkt " +
        index +
        " – förstärkt skyddsutrustning för lagerpersonal med extra långa produktnamn och å, ä, ö",
      expected,
      counted,
      difference: -2,
      expectedValueUnits: (BigInt(expected) * valueUnits).toString(),
      countedValueUnits: (BigInt(counted) * valueUnits).toString(),
      valueDifferenceUnits: (BigInt(-2) * valueUnits).toString(),
    };
  });
  const report: InventoryReport = {
    ...original,
    name: "Årsinventering med en lång rubrik som ska kunna radbrytas snyggt utan att något försvinner ur dokumentet",
    places: [{ ...original.places[0], rows }, original.places[1]],
    summary: {
      ...original.summary,
      products: rows.length,
      rows: rows.length,
      discrepancies: rows.length,
      expected: String(rows.reduce((sum, row) => sum + row.expected, 0)),
      counted: String(rows.reduce((sum, row) => sum + row.counted, 0)),
      difference: "-130",
      shortage: "-130",
      expectedValueUnits: rows
        .reduce(
          (sum, row) => sum + BigInt(row.expectedValueUnits ?? "0"),
          BigInt(0),
        )
        .toString(),
      countedValueUnits: rows
        .reduce(
          (sum, row) => sum + BigInt(row.countedValueUnits ?? "0"),
          BigInt(0),
        )
        .toString(),
      valueDifferenceUnits: rows
        .reduce(
          (sum, row) => sum + BigInt(row.valueDifferenceUnits ?? "0"),
          BigInt(0),
        )
        .toString(),
    },
  };
  const bytes = await renderInventoryReport(report);
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  assert.ok(
    (bytes.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length > 2,
  );
  assert.match(
    inventoryReportFilename({
      ...report,
      name: 'Årsrapport / "test"\r\nHeader',
    }),
    /^inventering-[a-z0-9-]+\.pdf$/,
  );
  await writeFile(path.join(folder, "multipage.pdf"), bytes);
  await writeFile(path.join(folder, "multipage.json"), JSON.stringify(report));
  console.log("PDF verification artifacts: " + folder);
});
