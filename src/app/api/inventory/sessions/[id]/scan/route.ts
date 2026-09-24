import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { rateLimit } from "@/lib/server/rate-limit";
import { resolveInventoryLocation } from "@/features/scanner/service";
import { scanLocationSchema } from "@/validation/scan";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return api(async () => {
    assertOrigin(request);
    const context = await requireTenant();
    await rateLimit("inventory:scan:" + context.userId, 120);
    return resolveInventoryLocation(context, (await params).id, await readJson(request, scanLocationSchema));
  });
}
