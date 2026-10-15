import "server-only";
import { AppError } from "@/lib/server/errors";
import type { TenantContext } from "@/lib/server/tenant";
import { InventoryLevel } from "@/models/inventory-level";
import { Location } from "@/models/location";
import { Organization } from "@/models/organization";
import { Product } from "@/models/product";
import { Warehouse } from "@/models/warehouse";
import { objectIdSchema } from "@/validation/organization";
import { organizationDocumentDetails } from "@/features/organizations/document-profile";
import { legacyOreToSek, sekToUnits } from "@/lib/money";

export async function getLocationStockReport(
  context: TenantContext,
  warehouseId?: string,
) {
  const selectedWarehouseId = warehouseId
    ? objectIdSchema.parse(warehouseId)
    : undefined;
  const visible = context.role === "admin" ? {} : { active: true };
  const [organization, warehouses] = await Promise.all([
    Organization.findOne({ _id: context.organizationId }).select(
      "name organizationNumber addressLine1 addressLine2 postalCode city country contactEmail phone website",
    ).lean(),
    Warehouse.find({
      organizationId: context.organizationId,
      ...(selectedWarehouseId ? { _id: selectedWarehouseId } : {}),
      ...visible,
    })
      .sort({ name: 1, _id: 1 })
      .lean(),
  ]);
  if (!organization)
    throw new AppError(
      404,
      "ORGANIZATION_NOT_FOUND",
      "Företaget kunde inte hittas.",
    );
  if (selectedWarehouseId && !warehouses.length)
    throw new AppError(404, "WAREHOUSE_NOT_FOUND", "Lagret kunde inte hittas.");

  const locations = await Location.find({
    organizationId: context.organizationId,
    warehouseId: { $in: warehouses.map((warehouse) => warehouse._id) },
    ...visible,
  })
    .sort({ code: 1, _id: 1 })
    .lean();
  const levels = locations.length
    ? await InventoryLevel.find({
        organizationId: context.organizationId,
        locationId: { $in: locations.map((location) => location._id) },
      })
        .select("warehouseId productId locationId quantity")
        .lean()
    : [];
  const products = levels.length
    ? await Product.find({
        organizationId: context.organizationId,
        _id: { $in: levels.map((level) => level.productId) },
        ...visible,
      })
        .select("name sku active unitValue unitValueOre")
        .lean()
    : [];
  const productMap = new Map(
    products.map((product) => [String(product._id), product]),
  );
  const locationMap = new Map(
    locations.map((location) => [String(location._id), location]),
  );
  const rowsByLocation = new Map<
    string,
    Array<{
      productId: string;
      name: string;
      sku: string;
      quantity: number;
      unitValue: string | null;
      totalValueUnits: string | null;
      active: boolean;
    }>
  >();
  for (const level of levels) {
    const product = productMap.get(String(level.productId));
    const location = locationMap.get(String(level.locationId));
    if (
      !product ||
      !location ||
      String(level.warehouseId) !== String(location.warehouseId)
    )
      continue;
    const unitValue =
      product.unitValue !== undefined
        ? product.unitValue
        : legacyOreToSek(product.unitValueOre ?? null);
    const key = String(location._id);
    const rows = rowsByLocation.get(key) ?? [];
    rows.push({
      productId: String(product._id),
      name: product.name,
      sku: product.sku,
      quantity: level.quantity,
      unitValue,
      totalValueUnits:
        unitValue === null
          ? null
          : (BigInt(level.quantity) * sekToUnits(unitValue)).toString(),
      active: product.active,
    });
    rowsByLocation.set(key, rows);
  }

  const warehouseRows = warehouses
    .map((warehouse) => ({
      id: String(warehouse._id),
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address,
      active: warehouse.active,
      locations: locations
        .filter(
          (location) => String(location.warehouseId) === String(warehouse._id),
        )
        .map((location) => ({
          id: String(location._id),
          code: location.code,
          zone: location.zone,
          shelf: location.shelf,
          position: location.position,
          active: location.active,
          rows: (rowsByLocation.get(String(location._id)) ?? []).sort(
            (a, b) =>
              a.name.localeCompare(b.name, "sv") ||
              a.sku.localeCompare(b.sku, "sv"),
          ),
        }))
        .sort((a, b) =>
          a.code.localeCompare(b.code, "sv", { numeric: true }),
        ),
    }))
    .filter((warehouse) => warehouse.locations.length > 0);
  const locationRows = warehouseRows.flatMap(
    (warehouse) => warehouse.locations,
  );
  const productRows = locationRows.flatMap((location) => location.rows);
  const productsWithoutValue = new Set(
    productRows
      .filter((row) => row.unitValue === null)
      .map((row) => row.productId),
  ).size;
  const inventoryValueUnits = productRows
    .reduce(
      (total, row) =>
        total +
        (row.totalValueUnits === null ? BigInt(0) : BigInt(row.totalValueUnits)),
      BigInt(0),
    )
    .toString();
  return {
    companyName: organization.name,
    companyDetails: organizationDocumentDetails(organization),
    scopeName: selectedWarehouseId
      ? (warehouses[0]?.name ?? "Valt lager")
      : "Alla lager",
    warehouses: warehouseRows,
    summary: {
      warehouses: warehouseRows.length,
      locations: locationRows.length,
      emptyLocations: locationRows.filter((location) => !location.rows.length)
        .length,
      uniqueProducts: new Set(productRows.map((row) => row.productId)).size,
      productsWithoutValue,
      inventoryValueUnits,
    },
  };
}

export type LocationStockReport = Awaited<
  ReturnType<typeof getLocationStockReport>
>;
