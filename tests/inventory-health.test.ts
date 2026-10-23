import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getInventoryHealthReason,
  summarizeInventoryHealthPositions,
  type HealthMovement,
  type InventoryPositionHealth,
} from "../src/features/inventory/inventory-health";

const now = new Date("2026-10-21T12:00:00.000Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);
const baseline = (days = 0, quantity = 20) => ({
  countedQuantity: quantity,
  countedAt: daysAgo(days),
  ledgerFrom: daysAgo(days),
});
const movement = (overrides: Partial<HealthMovement> = {}): HealthMovement => ({
  id: "1",
  type: "RECEIPT",
  previousQuantity: 20,
  newQuantity: 25,
  difference: 5,
  createdAt: new Date("2026-10-21T13:00:00.000Z"),
  ...overrides,
});
const evaluate = (quantity: number, movements: HealthMovement[] = [], days = 0) =>
  getInventoryHealthReason({ quantity, baseline: baseline(days), movements, now });

test("a completed physical count establishes a trusted baseline", () => {
  assert.deepEqual(evaluate(20), { trusted: true, reason: "VERIFIED", ageDays: 0, expectedQuantity: 20 });
});

test("a traceable receipt preserves trust", () => {
  assert.equal(evaluate(25, [movement()]).reason, "VERIFIED");
});

test("a current level that differs from the ledger is a mismatch", () => {
  const result = evaluate(24, [movement()]);
  assert.equal(result.reason, "LEDGER_MISMATCH");
  assert.equal(result.expectedQuantity, 25);
});

test("a position without a physical count has never been counted", () => {
  const result = getInventoryHealthReason({ quantity: 4, baseline: null, movements: [], now });
  assert.equal(result.reason, "NEVER_COUNTED");
  assert.equal(result.trusted, false);
});

test("a 35 day old baseline needs verification", () => {
  assert.equal(evaluate(20, [], 35).reason, "NEEDS_VERIFICATION");
});

test("a 100 day old baseline is stale", () => {
  assert.equal(evaluate(20, [], 100).reason, "STALE");
});

test("an open discrepancy takes precedence over an otherwise valid ledger", () => {
  const result = getInventoryHealthReason({ quantity: 20, baseline: baseline(), movements: [], hasOpenDiscrepancy: true, now });
  assert.equal(result.reason, "OPEN_DISCREPANCY");
});

test("a manual correction requires a new physical verification", () => {
  const result = evaluate(18, [movement({ type: "CORRECTION", newQuantity: 18, difference: -2 })]);
  assert.equal(result.reason, "MANUAL_CORRECTION");
});

const position = (overrides: Partial<InventoryPositionHealth> = {}): InventoryPositionHealth => ({
  productId: "p1", productName: "Produkt", sku: "SKU-1",
  locationId: "l1", locationCode: "A-01-01", zone: "A",
  warehouseId: "w1", warehouseName: "Lager", quantity: 20,
  trusted: true, reason: "VERIFIED", verifiedAt: now.toISOString(), ageDays: 0,
  expectedQuantity: 20, inventorySessionId: "i1", discrepancy: null,
  ...overrides,
});

test("products without a physical position are excluded from the score", () => {
  const summary = summarizeInventoryHealthPositions([position()], 2);
  assert.equal(summary.score, 100);
  assert.equal(summary.productsWithoutInventory, 1);
  assert.equal(summary.totalProductsWithInventory, 1);
});

test("an organization without inventory positions has no artificial zero score", () => {
  const summary = summarizeInventoryHealthPositions([], 3);
  assert.equal(summary.score, null);
  assert.equal(summary.productsWithoutInventory, 3);
});

test("the score is position based and a product is verified only when all positions are trusted", () => {
  const summary = summarizeInventoryHealthPositions([
    position(),
    position({ locationId: "l2", locationCode: "A-01-02", trusted: false, reason: "STALE", ageDays: 100 }),
    position({ productId: "p2", locationId: "l3", locationCode: "A-01-03" }),
  ], 2);
  assert.equal(summary.score, 67);
  assert.equal(summary.fullyVerifiedProducts, 1);
  assert.equal(summary.totalPositions, 3);
});

test("attention items follow risk priority and then physical location", () => {
  const summary = summarizeInventoryHealthPositions([
    position({ locationId: "l3", locationCode: "B-01-01", trusted: false, reason: "DUE_SOON" }),
    position({ locationId: "l2", locationCode: "A-01-02", trusted: false, reason: "LEDGER_MISMATCH" }),
    position({ locationId: "l1", locationCode: "A-01-01", trusted: false, reason: "OPEN_DISCREPANCY" }),
  ], 1);
  assert.deepEqual(summary.attentionItems.map(row => row.reason), ["OPEN_DISCREPANCY", "LEDGER_MISMATCH", "DUE_SOON"]);
});
