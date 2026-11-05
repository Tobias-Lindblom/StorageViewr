import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { getWarehouse, updateWarehouse } from "@/features/warehouses/service";
import { warehouseUpdateSchema } from "@/validation/warehouse";

type RouteContext = { params: Promise<{ id: string }> };
export async function GET(request: Request, route: RouteContext) {
  return api(request, async () => getWarehouse(await requireTenant(), (await route.params).id));
}
export async function PATCH(request: Request, route: RouteContext) {
  return api(request, async () => {
    assertOrigin(request);
    return updateWarehouse(await requireTenant(), (await route.params).id, await readJson(request, warehouseUpdateSchema));
  });
}
