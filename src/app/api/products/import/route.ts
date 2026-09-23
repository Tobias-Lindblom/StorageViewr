import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireAdmin, requireTenant } from "@/lib/server/tenant";
import { rateLimit } from "@/lib/server/rate-limit";
import { importProducts } from "@/features/products/import";
import { productImportSchema } from "@/validation/product";
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const context = await requireTenant();
    requireAdmin(context);
    await rateLimit("products:import:" + context.userId, 20);
    return importProducts(context, await readJson(request, productImportSchema, 3_100_000));
  });
}
