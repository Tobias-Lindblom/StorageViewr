import "server-only";
import { Warehouse } from "@/models/warehouse";
import { Location } from "@/models/location";
import type { TenantContext } from "@/lib/server/tenant";
import { listWarehouses } from "@/features/warehouses/service";

export async function getDashboard(context: TenantContext) {
  const filter = { organizationId: context.organizationId, active: true };
  const [warehouseCount, locationCount, warehouses] = await Promise.all([
    Warehouse.countDocuments(filter), Location.countDocuments(filter), listWarehouses(context),
  ]);
  return { warehouseCount, locationCount, warehouses: warehouses.filter(item => item.active).slice(0, 5) };
}
