import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { rateLimit } from "@/lib/server/rate-limit";
import { locationScanSchema } from "@/validation/scan";
import { resolveLocation } from "@/features/scanner/service";

export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const context = await requireTenant();
    await rateLimit("locations:scan:" + context.userId, 120);
    return resolveLocation(context, await readJson(request, locationScanSchema));
  });
}
