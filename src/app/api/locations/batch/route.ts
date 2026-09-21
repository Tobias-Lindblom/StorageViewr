import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { rateLimit } from "@/lib/server/rate-limit";
import { createLocationBatch } from "@/features/locations/service";
import { locationBatchSchema } from "@/validation/location";

export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const context = await requireTenant();
    await rateLimit("locations:batch:" + context.userId, 20);
    return createLocationBatch(context, await readJson(request, locationBatchSchema));
  }, 201);
}
