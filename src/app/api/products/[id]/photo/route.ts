import { apiResponse } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { getProductPhotoAccess, readProductPhotoData } from "@/features/products/photos";

export const runtime = "nodejs";
export async function GET(request: Request, route: { params: Promise<{ id: string }> }) {
  return apiResponse(request, async () => {
    const context = await requireTenant();
    const { id } = await route.params;
    const size = new URL(request.url).searchParams.get("size") === "thumbnail"
      ? "thumbnail"
      : "detail";
    const access = await getProductPhotoAccess(context, id);
    const etag = `"product-${id}-${access.version}-${size}"`;
    const headers = {
      "Cache-Control": "private, no-cache, must-revalidate",
      "ETag": etag,
      "Vary": "Cookie",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
    };
    if (request.headers.get("if-none-match") === etag)
      return new Response(null, { status: 304, headers });
    const data = await readProductPhotoData(context, access.productId, size);
    return new Response(new Uint8Array(data), { headers: {
      ...headers,
      "Content-Type": "image/webp", "Content-Length": String(data.length),
    } });
  });
}
