import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { rateLimit } from "@/lib/server/rate-limit";
import { listWarehouses, createWarehouse } from "@/features/warehouses/service";
import { warehouseSchema } from "@/validation/warehouse";

export async function GET() {
  return api(async () => listWarehouses(await requireTenant()));
}
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const context = await requireTenant();
    await rateLimit("warehouses:create:" + context.userId, 60);
    return createWarehouse(context, await readJson(request, warehouseSchema));
  }, 201);
}
