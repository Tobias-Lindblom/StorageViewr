import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { rateLimit } from "@/lib/server/rate-limit";
import { listLocations, createLocation } from "@/features/locations/service";
import { locationSchema } from "@/validation/location";

export async function GET(request: Request) {
  return api(async () => listLocations(await requireTenant(), new URL(request.url).searchParams.get("warehouseId") ?? undefined));
}
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const context = await requireTenant();
    await rateLimit("locations:create:" + context.userId, 60);
    return createLocation(context, await readJson(request, locationSchema));
  }, 201);
}
