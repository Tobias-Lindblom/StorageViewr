import "server-only";
import { Warehouse } from "@/models/warehouse";
import { Location } from "@/models/location";
import { Product } from "@/models/product";
import type { TenantContext } from "@/lib/server/tenant";


export async function getDashboard(context: TenantContext) {
  const filter = { organizationId: context.organizationId, active: true };
  const [warehouseCount, locationCount, productCount] = await Promise.all([
    Warehouse.countDocuments(filter),
    Location.countDocuments(filter),
    Product.countDocuments(filter),

  ]);
  return {
    warehouseCount,
    locationCount,
    productCount,

  };
}
