import "server-only";
import { Warehouse } from "@/models/warehouse";
import { Location } from "@/models/location";
import { Product } from "@/models/product";
import type { TenantContext } from "@/lib/server/tenant";
import { listWarehouses } from "@/features/warehouses/service";

export async function getDashboard(context: TenantContext) {
  const filter = { organizationId: context.organizationId, active: true };
  const [warehouseCount, locationCount, productCount, warehouses] = await Promise.all([
    Warehouse.countDocuments(filter),
    Location.countDocuments(filter),
    Product.countDocuments(filter),
    listWarehouses(context),
  ]);
  return {
    warehouseCount,
    locationCount,
    productCount,
    warehouses: warehouses.filter((item) => item.active).slice(0, 5),
  };
}
