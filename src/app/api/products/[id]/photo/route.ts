import { api } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { readProductPhoto } from "@/features/products/photos";

export const runtime = "nodejs";
export async function GET(_request: Request, route: { params: Promise<{ id: string }> }) {
  try {
    const data = await readProductPhoto(await requireTenant(), (await route.params).id);
    return new Response(new Uint8Array(data), { headers: {
      "Content-Type": "image/webp", "Content-Length": String(data.length),
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
    } });
  } catch (error) { return api(async () => { throw error; }); }
}
