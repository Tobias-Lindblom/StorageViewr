import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { getLocation, updateLocation } from "@/features/locations/service";
import { locationUpdateSchema } from "@/validation/location";

type RouteContext = { params: Promise<{ id: string }> };
export async function GET(_request: Request, route: RouteContext) {
  return api(async () => getLocation(await requireTenant(), (await route.params).id));
}
export async function PATCH(request: Request, route: RouteContext) {
  return api(async () => {
    assertOrigin(request);
    return updateLocation(await requireTenant(), (await route.params).id, await readJson(request, locationUpdateSchema));
  });
}
