import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireAdmin, requireTenant } from "@/lib/server/tenant";
import { rateLimit } from "@/lib/server/rate-limit";
import { listProducts, createProduct } from "@/features/products/service";
import { productCreateRequestSchema } from "@/validation/product";
import { PHOTO_REQUEST_BYTES } from "@/validation/product-photo";
export async function GET(request: Request) {
  return api(async () => listProducts(await requireTenant(), Object.fromEntries(new URL(request.url).searchParams)));
}
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const context = await requireTenant();
    requireAdmin(context);
    await rateLimit("products:create:" + context.userId, 60);
    return createProduct(context, await readJson(request, productCreateRequestSchema, PHOTO_REQUEST_BYTES));
  }, 201);
}
