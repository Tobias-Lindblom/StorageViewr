import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireAdmin, requireTenant } from "@/lib/server/tenant";
import { rateLimit } from "@/lib/server/rate-limit";
import { getProduct, updateProduct } from "@/features/products/service";
import { productUpdateRequestSchema } from "@/validation/product";
import { PHOTO_REQUEST_BYTES } from "@/validation/product-photo";
type RouteContext = { params: Promise<{ id: string }> };
export async function GET(_request: Request, route: RouteContext) {
  return api(async () => getProduct(await requireTenant(), (await route.params).id));
}
export async function PATCH(request: Request, route: RouteContext) {
  return api(async () => {
    assertOrigin(request);
    const context = await requireTenant();
    requireAdmin(context);
    await rateLimit("products:update:" + context.userId, 60);
    return updateProduct(context, (await route.params).id, await readJson(request, productUpdateRequestSchema, PHOTO_REQUEST_BYTES));
  });
}
