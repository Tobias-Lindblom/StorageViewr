import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { rateLimit } from "@/lib/server/rate-limit";
import { startInventory } from "@/features/inventory/sessions";
import { listInventories } from "@/features/inventory/session-queries";
import { startInventorySchema } from "@/validation/inventory-session";
export async function GET(request: Request) {
  return api(async () => listInventories(await requireTenant(), new URL(request.url).searchParams.get("page") ?? 1));
}
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const context = await requireTenant();
    await rateLimit("inventory:start:" + context.userId, 20);
    return startInventory(context, await readJson(request, startInventorySchema));
  }, 201);
}
