import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { getProduct, updateProduct } from "@/features/products/service";
import { productUpdateSchema } from "@/validation/product";
type RouteContext = { params: Promise<{ id: string }> };
export async function GET(_request: Request, route: RouteContext) {
  return api(async () => getProduct(await requireTenant(), (await route.params).id));
}
export async function PATCH(request: Request, route: RouteContext) {
  return api(async () => {
    assertOrigin(request);
    return updateProduct(await requireTenant(), (await route.params).id, await readJson(request, productUpdateSchema));
  });
}
