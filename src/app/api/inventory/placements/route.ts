import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { rateLimit } from "@/lib/server/rate-limit";
import { placeProduct } from "@/features/inventory/service";
import { stockPairSchema } from "@/validation/inventory";

export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const context = await requireTenant();
    await rateLimit("inventory:placement:" + context.userId, 60);
    return placeProduct(
      context,
      await readJson(request, stockPairSchema),
    );
  }, 201);
}
