import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Types } from "mongoose";
import { connectDb } from "../src/lib/server/db";
import { AppError } from "../src/lib/server/errors";
import { readJson } from "../src/lib/server/api";
import type { TenantContext } from "../src/lib/server/tenant";
import { Product } from "../src/models/product";
import {
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "../src/features/products/service";
import {
  importProducts,
  parseProductCsv,
} from "../src/features/products/import";
import { productSchema, productImportSchema } from "../src/validation/product";

let replica: MongoMemoryReplSet;
before(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = replica.getUri();
  process.env.MONGODB_DB = "storageviewr_product_tests";
  await connectDb();
  await Product.createCollection();
  await Product.createIndexes();
});
after(async () => {
  await (await connectDb()).disconnect();
  await replica?.stop();
});
const tenant = (): TenantContext => ({
  userId: new Types.ObjectId(),
  organizationId: new Types.ObjectId(),
  role: "admin",
});
const status = (expected: number) => (error: unknown) =>
  error instanceof AppError && error.status === expected;
const input = {
  sku: "TEST-01",
  name: "Arbetshandske",
  barcode: "001234",
  description: "",
  imageUrl: "",
};
const request = (
  csv: string,
  mode: "preview" | "commit" = "preview",
  context?: TenantContext,
) => ({
  csv,
  mode,
  delimiter: "," as const,
  ...(context
    ? { expectedOrganizationId: context.organizationId.toString() }
    : {}),
});

test("products enforce tenant ownership, admin writes and normalized compound uniqueness", async () => {
  const a = tenant(),
    b = tenant(),
    worker: TenantContext = { ...a, role: "warehouse" };
  const own = await createProduct(a, input),
    foreign = await createProduct(b, input);
  assert.equal((await listProducts(a)).total, 1);
  await assert.rejects(getProduct(a, foreign.id), status(404));
  await assert.rejects(
    updateProduct(a, foreign.id, { ...input, active: false }),
    status(404),
  );
  await assert.rejects(
    createProduct(a, { ...input, sku: " test-01 " }),
    status(409),
  );
  await assert.rejects(
    createProduct(a, {
      ...input,
      sku: "NEW",
      organizationId: b.organizationId.toString(),
    }),
  );
  await assert.rejects(
    createProduct(worker, { ...input, sku: "NEW" }),
    status(403),
  );
  await assert.rejects(
    updateProduct(worker, own.id, { ...input, active: false }),
    status(403),
  );
  await assert.rejects(
    importProducts(worker, request("sku,name\nNEW,Ny produkt")),
    status(403),
  );
  assert.equal((await getProduct(b, foreign.id)).name, input.name);
});

test("product editing, inactivation and reactivation preserve identity and reserve the SKU", async () => {
  const a = tenant(),
    worker: TenantContext = { ...a, role: "warehouse" };
  const own = await createProduct(a, input);
  await createProduct(a, { ...input, sku: "OTHER" });
  await assert.rejects(
    updateProduct(a, own.id, { ...input, sku: "other", active: true }),
    status(409),
  );
  assert.equal((await getProduct(a, own.id)).sku, input.sku);
  await updateProduct(a, own.id, {
    ...input,
    name: "Ny handske",
    active: false,
  });
  await assert.rejects(getProduct(worker, own.id), status(404));
  assert.equal(
    (await listProducts(worker, { status: "all" })).items.some(
      (row) => row.id === own.id,
    ),
    false,
  );
  assert.equal(
    (await listProducts(a, { status: "inactive" })).items[0].id,
    own.id,
  );
  await assert.rejects(createProduct(a, input), status(409));
  assert.equal(
    (await updateProduct(a, own.id, { ...input, active: true })).id,
    own.id,
  );
  assert.equal((await getProduct(worker, own.id)).barcode, "001234");
});

test("search escapes regex characters, searches name SKU and barcode, and paginates within a tenant", async () => {
  const a = tenant();
  const own = await createProduct(a, { ...input, name: "Handsken [blå]" });
  await createProduct(tenant(), { ...input, name: "Handsken [blå]" });
  for (const q of ["[blå]", "test-01", "001234"])
    assert.equal((await listProducts(a, { q })).items[0].id, own.id);
  assert.equal((await listProducts(a, { q: ".*" })).total, 0);
  await Product.insertMany(
    Array.from({ length: 30 }, (_, index) => ({
      ...input,
      organizationId: a.organizationId,
      sku: "ITEM-" + index,
      name: "Produkt " + index,
    })),
  );
  const first = await listProducts(a),
    second = await listProducts(a, { page: 2 });
  assert.equal(first.total, 31);
  assert.equal(first.items.length, 24);
  assert.equal(second.items.length, 7);
  assert.equal(
    new Set([...first.items, ...second.items].map((row) => row.id)).size,
    31,
  );
  await assert.rejects(listProducts(a, { q: { $ne: null } }));
});

test("CSV parser supports BOM, semicolons, quoted delimiters, multiline fields and leading barcode zeros", () => {
  const rows = parseProductCsv(
    '\uFEFFsku;name;barcode;description\r\na-1;"Skruv; M8";00123;"Två rader\nmed ""citat"""\r\n',
    ";",
  );
  assert.equal(rows[0].product?.sku, "A-1");
  assert.equal(rows[0].product?.name, "Skruv; M8");
  assert.equal(rows[0].product?.barcode, "00123");
  assert.equal(rows[0].product?.description, 'Två rader\nmed "citat"');
  assert.deepEqual(rows[0].errors, []);
  assert.equal(rows[0].line, 3);
});

test("CSV validation rejects malformed headers, records, oversized files, excess rows and unsafe fields", () => {
  for (const csv of [
    "",
    "sku,name",
    "name,barcode\nNamn,1",
    "sku,name,sku\nA,Namn,A",
    "sku,name,organizationId\nA,Namn,x",
    'sku,name\nA,"Broken',
    "sku,name\nA,Namn,extra",
  ]) {
    assert.throws(() => parseProductCsv(csv, ","), status(400));
  }
  assert.throws(
    () => parseProductCsv("sku,name\nA," + "å".repeat(250000), ","),
    status(413),
  );
  assert.throws(
    () =>
      parseProductCsv(
        "sku,name\n" +
          Array.from({ length: 501 }, (_, index) => "S" + index + ",Namn").join(
            "\n",
          ),
        ",",
      ),
    status(400),
  );
  const duplicate = parseProductCsv("sku,name\na-1,Namn\n A-1 ,Namn", ",");
  assert.ok(duplicate.every((row) => row.errors.length > 0));
  const invalid = parseProductCsv(
    "sku,name,imageUrl\nA,Namn,javascript:alert(1)\nB,X,\nC,Namn,https://example.com/image.png",
    ",",
  );
  assert.equal(invalid.filter((row) => row.errors.length).length, 2);
  assert.equal(
    productSchema.safeParse({ ...input, active: false }).success,
    false,
  );
});

test("CSV preview writes nothing, reports row errors and existing inactive SKUs only in the current tenant", async () => {
  const a = tenant(),
    b = tenant();
  const own = await createProduct(a, input);
  await updateProduct(a, own.id, { ...input, active: false });
  await createProduct(b, { ...input, sku: "FOREIGN" });
  const csv =
    "sku,name\n test-01 ,Namn\nFOREIGN,Namn\nDUPE,Namn\ndupe,Namn\nINVALID,X";
  const preview = await importProducts(a, request(csv));
  assert.equal(preview.invalid, 4);
  assert.equal(preview.valid, 1);
  assert.equal(preview.rows[0].line, 2);
  assert.equal(
    await Product.countDocuments({ organizationId: a.organizationId }),
    1,
  );
  await assert.rejects(
    importProducts(a, request(csv, "commit", a)),
    status(409),
  );
  assert.equal(
    await Product.countDocuments({ organizationId: a.organizationId }),
    1,
  );
});

test("CSV commit revalidates changed company and new conflicts; repeated submission creates no duplicates", async () => {
  const a = tenant(),
    b = tenant();
  const csv = "sku,name,barcode\nNEW-1,Ny produkt,001234\nNEW-2,Annan produkt,";
  await importProducts(a, request(csv));
  await assert.rejects(
    importProducts(b, request(csv, "commit", a)),
    status(409),
  );
  await assert.rejects(importProducts(a, request(csv, "commit")), status(409));
  await createProduct(a, { ...input, sku: "NEW-2" });
  await assert.rejects(
    importProducts(a, request(csv, "commit", a)),
    status(409),
  );
  assert.equal(
    await Product.countDocuments({
      organizationId: a.organizationId,
      sku: "NEW-1",
    }),
    0,
  );
  const imported = await importProducts(b, request(csv, "commit", b));
  assert.equal(imported.imported, 2);
  assert.equal(
    (await listProducts(b, { q: "NEW-1" })).items[0].barcode,
    "001234",
  );
  await assert.rejects(
    importProducts(b, request(csv, "commit", b)),
    status(409),
  );
  assert.equal(
    await Product.countDocuments({ organizationId: b.organizationId }),
    2,
  );
});

test("concurrent CSV imports commit one complete batch and roll back the conflicting batch", async () => {
  const a = tenant();
  const first = "sku,name\nUNIQUE-A,Namn\nSHARED,Namn";
  const second = "sku,name\nUNIQUE-B,Namn\nSHARED,Namn";
  const results = await Promise.allSettled([
    importProducts(a, request(first, "commit", a)),
    importProducts(a, request(second, "commit", a)),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    await Product.countDocuments({ organizationId: a.organizationId }),
    2,
  );
  assert.equal(
    await Product.countDocuments({
      organizationId: a.organizationId,
      sku: "SHARED",
    }),
    1,
  );
});

test("JSON size limits stay small by default and are explicitly expanded for bounded CSV input", async () => {
  const csv = "sku,name\n" + "A,Namn\n".repeat(3000);
  const makeRequest = () =>
    new Request("http://localhost/api/products/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request(csv)),
    });
  await assert.rejects(
    readJson(makeRequest(), productImportSchema),
    status(413),
  );
  assert.equal(
    (await readJson(makeRequest(), productImportSchema, 3_100_000)).csv,
    csv,
  );
});
