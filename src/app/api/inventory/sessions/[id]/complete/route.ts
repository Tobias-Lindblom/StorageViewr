import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { rateLimit } from "@/lib/server/rate-limit";
import { finishInventory } from "@/features/inventory/sessions";
import { finishInventorySchema } from "@/validation/inventory-session";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    assertOrigin(request);
    const context = await requireTenant();
    await rateLimit("inventory:finish:" + context.userId, 30);
    return finishInventory(
      context,
      (await params).id,
      await readJson(request, finishInventorySchema),
    );
  });
}
