import "server-only";
import type { TenantContext } from "@/lib/server/tenant";
import {
  getInventoryHealthSummary,
  INVENTORY_HEALTH_PRIORITY,
  type InventoryPositionHealth,
} from "@/features/inventory/inventory-health";

function uniqueFocusLocations(items: InventoryPositionHealth[]) {
  if (!items.length) return [];
  const warehouseId = items[0].warehouseId;
  const inWarehouse = items.filter(row => row.warehouseId === warehouseId)
    .sort((a, b) => INVENTORY_HEALTH_PRIORITY[a.reason] - INVENTORY_HEALTH_PRIORITY[b.reason] ||
      a.zone.localeCompare(b.zone, "sv", { numeric: true }) ||
      a.locationCode.localeCompare(b.locationCode, "sv", { numeric: true }));
  const locations = new Map<string, typeof inWarehouse[number]>();
  for (const item of inWarehouse) {
    if (!locations.has(item.locationId)) locations.set(item.locationId, item);
    if (locations.size === 7) break;
  }
  return [...locations.values()];
}

export async function getDashboardInsights(context: TenantContext) {
  const health = await getInventoryHealthSummary(context);
  const focusLocations = uniqueFocusLocations(health.attentionItems);
  const focusIds = new Set(focusLocations.map(row => row.locationId));
  const focusItems = health.attentionItems.filter(row => focusIds.has(row.locationId));
  return {
    health: { ...health, positions: [], attentionItems: health.attentionItems.slice(0, 50) },
    pendingDiscrepancies: health.openDiscrepancies,
    suggestedLocations: focusLocations.map(row => ({
      id: row.locationId,
      code: row.locationCode,
      zone: row.zone,
      warehouseId: row.warehouseId,
      warehouseName: row.warehouseName,
      reason: row.reason,
      countedAt: row.verifiedAt,
    })),
    focus: {
      positions: focusItems.length,
      products: new Set(focusItems.map(row => row.productId)).size,
      openDiscrepancies: focusItems.filter(row => row.reason === "OPEN_DISCREPANCY").length,
      ledgerMismatches: focusItems.filter(row => row.reason === "LEDGER_MISMATCH").length,
      neverCounted: focusItems.filter(row => row.reason === "NEVER_COUNTED").length,
      manualCorrections: focusItems.filter(row => row.reason === "MANUAL_CORRECTION").length,
      stale: focusItems.filter(row => row.reason === "STALE").length,
      needsVerification: focusItems.filter(row => row.reason === "NEEDS_VERIFICATION").length,
      dueSoon: focusItems.filter(row => row.reason === "DUE_SOON").length,
    },
  };
}
