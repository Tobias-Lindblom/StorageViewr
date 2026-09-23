import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { rateLimit } from "@/lib/server/rate-limit";
import { listProducts, createProduct } from "@/features/products/service";
import { productSchema } from "@/validation/product";
export async function GET(request: Request) {
  return api(async () => listProducts(await requireTenant(), Object.fromEntries(new URL(request.url).searchParams)));
}
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const context = await requireTenant();
    await rateLimit("products:create:" + context.userId, 60);
    return createProduct(context, await readJson(request, productSchema));
  }, 201);
}
