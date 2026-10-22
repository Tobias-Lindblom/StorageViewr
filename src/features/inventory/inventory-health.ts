import "server-only";
import { Types } from "mongoose";
import type { TenantContext } from "@/lib/server/tenant";
import { InventoryCount } from "@/models/inventory-count";
import { InventoryDiscrepancy } from "@/models/inventory-discrepancy";
import { InventoryLevel } from "@/models/inventory-level";
import { InventoryMovement } from "@/models/inventory-movement";
import { Product } from "@/models/product";

export const VERIFIED_MAX_DAYS = 20;
export const DUE_SOON_MAX_DAYS = 30;
export const STALE_AFTER_DAYS = 90;
const DAY_MS = 86_400_000;

export type InventoryHealthReason =
  | "VERIFIED"
  | "DUE_SOON"
  | "NEEDS_VERIFICATION"
  | "NEVER_COUNTED"
  | "STALE"
  | "OPEN_DISCREPANCY"
  | "MANUAL_CORRECTION"
  | "LEDGER_MISMATCH";

export const INVENTORY_HEALTH_PRIORITY: Record<InventoryHealthReason, number> = {
  OPEN_DISCREPANCY: 1,
  NEVER_COUNTED: 2,
  STALE: 3,
  LEDGER_MISMATCH: 4,
  MANUAL_CORRECTION: 4,
  NEEDS_VERIFICATION: 4,
  DUE_SOON: 5,
  VERIFIED: 6,
};

export type HealthMovement = {
  id?: string;
  type: string;
  previousQuantity: number;
  newQuantity: number;
  difference: number;
  createdAt: Date;
  transferId?: string | null;
  transferComplete?: boolean;
};

export type InventoryPositionHealth = {
  productId: string;
  productName: string;
  sku: string;
  locationId: string;
  locationCode: string;
  zone: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  trusted: boolean;
  reason: InventoryHealthReason;
  verifiedAt: string | null;
  ageDays: number | null;
  expectedQuantity: number | null;
  inventorySessionId: string | null;
  discrepancy?: {
    id: string;
    inventorySessionId: string;
    expectedQuantity: number;
    countedQuantity: number;
    difference: number;
  } | null;
};

export type InventoryHealthSummary = {
  score: number | null;
  totalPositions: number;
  trustedPositions: number;
  verified: number;
  dueSoon: number;
  needsVerification: number;
  stale: number;
  neverCounted: number;
  openDiscrepancies: number;
  manualCorrections: number;
  ledgerMismatches: number;
  fullyVerifiedProducts: number;
  totalProductsWithInventory: number;
  productsWithoutInventory: number;
  positions: InventoryPositionHealth[];
  attentionItems: InventoryPositionHealth[];
};

export type PositionHealthInput = {
  quantity: number;
  baseline: {
    countedQuantity: number;
    countedAt: Date;
    ledgerFrom: Date;
  } | null;
  movements: HealthMovement[];
  hasOpenDiscrepancy?: boolean;
  now?: Date;
};

/**
 * Evaluates one physical product/location position. A completed count is the
 * physical baseline; every later movement must form an unbroken before/after
 * chain ending at the current InventoryLevel.
 */
export function getInventoryHealthReason(input: PositionHealthInput): {
  trusted: boolean;
  reason: InventoryHealthReason;
  ageDays: number | null;
  expectedQuantity: number | null;
} {
  if (input.hasOpenDiscrepancy && !input.baseline) {
    return { trusted: false, reason: "OPEN_DISCREPANCY", ageDays: null, expectedQuantity: null };
  }
  if (!input.baseline) {
    return { trusted: false, reason: "NEVER_COUNTED", ageDays: null, expectedQuantity: null };
  }

  const now = input.now ?? new Date();
  const ageDays = Math.max(0, Math.floor((now.getTime() - input.baseline.countedAt.getTime()) / DAY_MS));
  let expected = input.baseline.countedQuantity;
  let manualCorrection = false;
  let ledgerMismatch = false;

  const movements = input.movements
    .filter(movement => movement.createdAt.getTime() > input.baseline!.ledgerFrom.getTime())
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || (a.id ?? "").localeCompare(b.id ?? ""));

  for (const movement of movements) {
    const arithmeticMatches = movement.newQuantity === movement.previousQuantity + movement.difference;
    const transferMatches = !movement.type.startsWith("TRANSFER_") || movement.transferComplete === true;
    if (movement.previousQuantity !== expected || !arithmeticMatches || !transferMatches) {
      ledgerMismatch = true;
      break;
    }
    expected = movement.newQuantity;
    if (movement.type === "CORRECTION" || movement.type === "ADJUSTMENT") manualCorrection = true;
    else if (!["RECEIPT", "ISSUE", "TRANSFER_IN", "TRANSFER_OUT"].includes(movement.type)) {
      ledgerMismatch = true;
      break;
    }
  }

  if (expected !== input.quantity) ledgerMismatch = true;
  if (input.hasOpenDiscrepancy)
    return { trusted: false, reason: "OPEN_DISCREPANCY", ageDays, expectedQuantity: expected };
  if (ledgerMismatch)
    return { trusted: false, reason: "LEDGER_MISMATCH", ageDays, expectedQuantity: expected };
  if (manualCorrection)
    return { trusted: false, reason: "MANUAL_CORRECTION", ageDays, expectedQuantity: expected };
  if (ageDays > STALE_AFTER_DAYS)
    return { trusted: false, reason: "STALE", ageDays, expectedQuantity: expected };
  if (ageDays > DUE_SOON_MAX_DAYS)
    return { trusted: false, reason: "NEEDS_VERIFICATION", ageDays, expectedQuantity: expected };
  if (ageDays > VERIFIED_MAX_DAYS)
    return { trusted: true, reason: "DUE_SOON", ageDays, expectedQuantity: expected };
  return { trusted: true, reason: "VERIFIED", ageDays, expectedQuantity: expected };
}

type PositionRow = {
  productId: Types.ObjectId;
  productName: string;
  sku: string;
  locationId: Types.ObjectId;
  locationCode: string;
  zone: string;
  warehouseId: Types.ObjectId;
  warehouseName: string;
  quantity: number;
};

type BaselineRow = {
  productId: Types.ObjectId;
  locationId: Types.ObjectId;
  countedQuantity: number;
  countedAt: Date;
  inventorySessionId: Types.ObjectId;
  completedAt: Date;
};

const pairKey = (productId: unknown, locationId: unknown) => `${String(productId)}:${String(locationId)}`;

export function summarizeInventoryHealthPositions(
  healthPositions: InventoryPositionHealth[],
  activeProductCount: number,
): InventoryHealthSummary {
  if (!healthPositions.length) {
    return {
      score: null, totalPositions: 0, trustedPositions: 0, verified: 0, dueSoon: 0,
      needsVerification: 0, stale: 0, neverCounted: 0, openDiscrepancies: 0,
      manualCorrections: 0, ledgerMismatches: 0, fullyVerifiedProducts: 0,
      totalProductsWithInventory: 0, productsWithoutInventory: activeProductCount,
      positions: [], attentionItems: [],
    };
  }
  const productGroups = new Map<string, InventoryPositionHealth[]>();
  for (const position of healthPositions) {
    const rows = productGroups.get(position.productId) ?? [];
    rows.push(position);
    productGroups.set(position.productId, rows);
  }
  const count = (reason: InventoryHealthReason) => healthPositions.filter(row => row.reason === reason).length;
  const trustedPositions = healthPositions.filter(row => row.trusted).length;
  const attentionItems = healthPositions.filter(row => row.reason !== "VERIFIED")
    .sort((a, b) => INVENTORY_HEALTH_PRIORITY[a.reason] - INVENTORY_HEALTH_PRIORITY[b.reason] ||
      a.warehouseName.localeCompare(b.warehouseName, "sv") || a.zone.localeCompare(b.zone, "sv", { numeric: true }) ||
      a.locationCode.localeCompare(b.locationCode, "sv", { numeric: true }) || a.productName.localeCompare(b.productName, "sv"));
  return {
    score: Math.round(trustedPositions / healthPositions.length * 100),
    totalPositions: healthPositions.length,
    trustedPositions,
    verified: count("VERIFIED"), dueSoon: count("DUE_SOON"),
    needsVerification: count("NEEDS_VERIFICATION"), stale: count("STALE"),
    neverCounted: count("NEVER_COUNTED"), openDiscrepancies: count("OPEN_DISCREPANCY"),
    manualCorrections: count("MANUAL_CORRECTION"), ledgerMismatches: count("LEDGER_MISMATCH"),
    fullyVerifiedProducts: [...productGroups.values()].filter(rows => rows.every(row => row.trusted)).length,
    totalProductsWithInventory: productGroups.size,
    productsWithoutInventory: Math.max(0, activeProductCount - productGroups.size),
    positions: healthPositions,
    attentionItems,
  };
}

function transferCompleteness(movements: Array<{
  transferId?: Types.ObjectId | null;
  productId: Types.ObjectId;
  type: string;
  difference: number;
}>) {
  const groups = new Map<string, typeof movements>();
  for (const movement of movements) {
    if (!movement.transferId) continue;
    const key = String(movement.transferId);
    const rows = groups.get(key) ?? [];
    rows.push(movement);
    groups.set(key, rows);
  }
  const complete = new Map<string, boolean>();
  for (const [id, rows] of groups) {
    const outgoing = rows.find(row => row.type === "TRANSFER_OUT");
    const incoming = rows.find(row => row.type === "TRANSFER_IN");
    complete.set(id, rows.length === 2 && Boolean(outgoing && incoming) &&
      String(outgoing?.productId) === String(incoming?.productId) &&
      outgoing?.difference === -(incoming?.difference ?? Number.NaN));
  }
  return complete;
}

export async function getInventoryHealthSummary(
  context: TenantContext,
  options: { now?: Date } = {},
): Promise<InventoryHealthSummary> {
  const organizationId = context.organizationId;
  const [positions, activeProductCount] = await Promise.all([
    InventoryLevel.aggregate<PositionRow>([
      { $match: { organizationId } },
      { $lookup: { from: "products", localField: "productId", foreignField: "_id", as: "product" } },
      { $unwind: "$product" },
      { $match: { "product.organizationId": organizationId, "product.active": true } },
      { $lookup: { from: "locations", localField: "locationId", foreignField: "_id", as: "location" } },
      { $unwind: "$location" },
      { $match: { "location.organizationId": organizationId, "location.active": true } },
      { $lookup: { from: "warehouses", localField: "warehouseId", foreignField: "_id", as: "warehouse" } },
      { $unwind: "$warehouse" },
      { $match: { "warehouse.organizationId": organizationId, "warehouse.active": true } },
      { $project: {
        productId: 1, productName: "$product.name", sku: "$product.sku",
        locationId: 1, locationCode: "$location.code", zone: "$location.zone",
        warehouseId: 1, warehouseName: "$warehouse.name", quantity: 1,
      } },
    ]),
    Product.countDocuments({ organizationId, active: true }),
  ]);

  if (!positions.length) {
    return summarizeInventoryHealthPositions([], activeProductCount);
  }

  const positionKeys = new Set(positions.map(row => pairKey(row.productId, row.locationId)));
  const [baselines, openDiscrepancies] = await Promise.all([
    InventoryCount.aggregate<BaselineRow>([
    { $match: { organizationId } },
    { $lookup: {
      from: "inventorySessions", let: { sessionId: "$inventorySessionId" },
      pipeline: [{ $match: { organizationId, status: "completed", $expr: { $eq: ["$_id", "$$sessionId"] } } }],
      as: "session",
    } },
    { $unwind: "$session" },
    { $lookup: {
      from: "inventoryDiscrepancies", let: {
        sessionId: "$inventorySessionId", productId: "$productId", locationId: "$locationId",
      },
      pipeline: [{ $match: { organizationId, status: "OPEN", $expr: { $and: [
        { $eq: ["$inventorySessionId", "$$sessionId"] }, { $eq: ["$productId", "$$productId"] },
        { $eq: ["$locationId", "$$locationId"] },
      ] } } }], as: "openDiscrepancy",
    } },
    { $match: { openDiscrepancy: { $eq: [] } } },
    { $sort: { "session.completedAt": -1, countedAt: -1, _id: -1 } },
    { $group: { _id: { productId: "$productId", locationId: "$locationId" }, row: { $first: "$$ROOT" } } },
    { $project: {
      _id: 0, productId: "$row.productId", locationId: "$row.locationId",
      countedQuantity: "$row.countedQuantity", countedAt: "$row.countedAt",
      inventorySessionId: "$row.inventorySessionId", completedAt: "$row.session.completedAt",
    } },
    ]),
    InventoryDiscrepancy.find({ organizationId, status: "OPEN" })
      .sort({ createdAt: -1, _id: -1 }).lean(),
  ]);
  const relevantBaselines = baselines.filter(row => positionKeys.has(pairKey(row.productId, row.locationId)));
  const baselineMap = new Map(relevantBaselines.map(row => [pairKey(row.productId, row.locationId), row]));
  const openDiscrepancyMap = new Map<string, typeof openDiscrepancies[number]>();
  for (const row of openDiscrepancies) {
    const key = pairKey(row.productId, row.locationId);
    if (positionKeys.has(key) && !openDiscrepancyMap.has(key)) openDiscrepancyMap.set(key, row);
  }
  const earliest = relevantBaselines.reduce<Date | null>((date, row) =>
    !date || row.completedAt < date ? row.completedAt : date, null);
  const movementRows = earliest ? await InventoryMovement.find({
    organizationId, createdAt: { $gt: earliest },
  }).sort({ createdAt: 1, _id: 1 }).lean() : [];
  const completeTransfers = transferCompleteness(movementRows);
  const movementsByPair = new Map<string, HealthMovement[]>();
  for (const movement of movementRows) {
    const key = pairKey(movement.productId, movement.locationId);
    if (!positionKeys.has(key)) continue;
    const rows = movementsByPair.get(key) ?? [];
    rows.push({
      id: String(movement._id), type: movement.type,
      previousQuantity: movement.previousQuantity, newQuantity: movement.newQuantity,
      difference: movement.difference, createdAt: movement.createdAt,
      transferId: movement.transferId ? String(movement.transferId) : null,
      transferComplete: movement.transferId ? completeTransfers.get(String(movement.transferId)) === true : undefined,
    });
    movementsByPair.set(key, rows);
  }

  const healthPositions = positions.map(row => {
    const key = pairKey(row.productId, row.locationId);
    const baseline = baselineMap.get(key);
    const discrepancy = openDiscrepancyMap.get(key);
    const result = getInventoryHealthReason({
      quantity: row.quantity,
      baseline: baseline ? {
        countedQuantity: baseline.countedQuantity,
        countedAt: baseline.countedAt,
        ledgerFrom: baseline.completedAt,
      } : null,
      movements: movementsByPair.get(key) ?? [],
      hasOpenDiscrepancy: Boolean(discrepancy),
      now: options.now,
    });
    return {
      productId: String(row.productId), productName: row.productName, sku: row.sku,
      locationId: String(row.locationId), locationCode: row.locationCode, zone: row.zone,
      warehouseId: String(row.warehouseId), warehouseName: row.warehouseName,
      quantity: row.quantity, ...result,
      verifiedAt: baseline?.countedAt.toISOString() ?? null,
      inventorySessionId: baseline ? String(baseline.inventorySessionId) : null,
      discrepancy: discrepancy ? {
        id: String(discrepancy._id), inventorySessionId: String(discrepancy.inventorySessionId),
        expectedQuantity: discrepancy.expectedQuantity,
        countedQuantity: discrepancy.countedQuantity, difference: discrepancy.difference,
      } : null,
    } satisfies InventoryPositionHealth;
  });

  return summarizeInventoryHealthPositions(healthPositions, activeProductCount);
}
