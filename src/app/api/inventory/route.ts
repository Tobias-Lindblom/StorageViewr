import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { rateLimit } from "@/lib/server/rate-limit";
import { adjustStock, listStock } from "@/features/inventory/service";
import { stockAdjustmentSchema } from "@/validation/inventory";
export async function GET(request: Request) {
  return api(async () => listStock(await requireTenant(), Object.fromEntries(new URL(request.url).searchParams)));
}
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const context = await requireTenant();
    await rateLimit("inventory:adjust:" + context.userId, 60);
    return adjustStock(context, await readJson(request, stockAdjustmentSchema));
  });
}
