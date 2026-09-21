import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { getOrganization, updateOrganization } from "@/features/organizations/service";
import { updateOrganizationSchema } from "@/validation/organization";
export async function GET() {
  return api(async () => getOrganization(await requireTenant()));
}
export async function PATCH(request: Request) {
  return api(async () => {
    assertOrigin(request);
    return updateOrganization(await requireTenant(), await readJson(request, updateOrganizationSchema));
  });
}
