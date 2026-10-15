import assert from "node:assert/strict";
import test from "node:test";
import { Schema, Types, model } from "mongoose";

test("a stale cached development model is recompiled with product value fields", async () => {
  const cached = model("Product", new Schema({ name: String }, { strict: true }));
  const { Product } = await import("../src/models/product");

  assert.notEqual(Product, cached);
  assert.ok(Product.schema.path("unitValue"));
  assert.ok(Product.schema.path("unitValueOre"));

  const product = new Product({
    organizationId: new Types.ObjectId(),
    sku: "TEST-01",
    name: "Testprodukt",
    unitValue: "0.8451",
    unitValueOre: 85,
  });
  assert.equal(product.unitValue, "0.8451");
  assert.equal(product.unitValueOre, 85);
  await product.validate();
});
