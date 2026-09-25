import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { rateLimit } from "@/lib/server/rate-limit";
import { registerStockMovement } from "@/features/inventory/service";
import { stockMovementSchema } from "@/validation/inventory";

export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const context = await requireTenant();
    await rateLimit("inventory:movement:" + context.userId, 60);
    return registerStockMovement(
      context,
      await readJson(request, stockMovementSchema),
    );
  });
}
