import "server-only";
import { AppError } from "@/lib/server/errors";
import type { TenantContext } from "@/lib/server/tenant";
import { objectIdSchema } from "@/validation/organization";
import { InventorySession } from "@/models/inventory-session";
import { InventorySessionLocation } from "@/models/inventory-session-location";
import { InventoryCount } from "@/models/inventory-count";
import { Organization } from "@/models/organization";
import { Warehouse } from "@/models/warehouse";

export async function getInventoryReport(context: TenantContext, id: string) {
  const inventory = await InventorySession.findOne({
    _id: objectIdSchema.parse(id),
    organizationId: context.organizationId,
  }).lean();
  if (!inventory)
    throw new AppError(
      404,
      "INVENTORY_NOT_FOUND",
      "Inventeringen kunde inte hittas.",
    );
  if (inventory.status !== "completed" || !inventory.completedAt) {
    throw new AppError(
      409,
      "INVENTORY_NOT_COMPLETED",
      "PDF-rapporten blir tillgänglig när inventeringen är genomförd.",
    );
  }
  const filter = {
    organizationId: context.organizationId,
    inventorySessionId: inventory._id,
  };
  const [organization, warehouse, scopes, counts] = await Promise.all([
    Organization.findOne({ _id: context.organizationId }).select("name").lean(),
    Warehouse.exists({
      _id: inventory.warehouseId,
      organizationId: context.organizationId,
    }),
    InventorySessionLocation.find(filter).lean(),
    InventoryCount.find(filter).lean(),
  ]);
  if (!organization || !warehouse)
    throw new AppError(
      404,
      "INVENTORY_NOT_FOUND",
      "Inventeringen kunde inte hittas.",
    );
  const scopeIds = new Set(scopes.map((row) => String(row.locationId)));
  if (
    !scopes.length ||
    scopes.some((row) => row.status !== "counted") ||
    counts.some((row) => !scopeIds.has(String(row.locationId)))
  ) {
    throw new AppError(
      409,
      "INVENTORY_REPORT_INCOMPLETE",
      "Rapportunderlaget är ofullständigt. Kontakta administratören.",
    );
  }
  const byLocation = new Map<string, typeof counts>();
  for (const count of counts) {
    const key = String(count.locationId);
    const group = byLocation.get(key) ?? [];
    group.push(count);
    byLocation.set(key, group);
  }
  const places = scopes
    .map((scope) => ({
      code: scope.locationCode,
      countedBy: scope.completedByName ?? "Ej sparat",
      countedAt: scope.completedAt?.toISOString() ?? null,
      rows: (byLocation.get(String(scope.locationId)) ?? [])
        .map((row) => ({
          productId: String(row.productId),
          name: row.productName,
          sku: row.sku,
          expected: row.expectedQuantity,
          counted: row.countedQuantity,
          difference: row.difference,
          countedBy: row.countedByName,
          countedAt: row.countedAt.toISOString(),
        }))
        .sort(
          (a, b) =>
            a.name.localeCompare(b.name, "sv") ||
            a.sku.localeCompare(b.sku, "sv"),
        ),
    }))
    .sort((a, b) => a.code.localeCompare(b.code, "sv", { numeric: true }));
  const rows = places.flatMap((place) => place.rows);
  // Exact totals even when multiple safe integer balances exceed JS's safe total.
  const sum = (values: number[]) =>
    values
      .reduce((total, value) => total + BigInt(value), BigInt(0))
      .toString();
  return {
    id: String(inventory._id),
    name: inventory.name,
    companyName: inventory.organizationName ?? organization.name,
    currentCompanyName: !inventory.organizationName,
    warehouseName: inventory.warehouseName,
    startedAt: inventory.startedAt.toISOString(),
    completedAt: inventory.completedAt.toISOString(),
    startedBy: inventory.startedByName ?? "Ej sparat",
    completedBy: inventory.completedByName ?? "Ej sparat",
    places,
    summary: {
      places: places.length,
      emptyPlaces: places.filter((place) => !place.rows.length).length,
      products: new Set(rows.map((row) => row.productId)).size,
      rows: rows.length,
      discrepancies: rows.filter((row) => row.difference !== 0).length,
      expected: sum(rows.map((row) => row.expected)),
      counted: sum(rows.map((row) => row.counted)),
      difference: sum(rows.map((row) => row.difference)),
      surplus: sum(
        rows.filter((row) => row.difference > 0).map((row) => row.difference),
      ),
      shortage: sum(
        rows.filter((row) => row.difference < 0).map((row) => row.difference),
      ),
    },
  };
}
export type InventoryReport = Awaited<ReturnType<typeof getInventoryReport>>;
