import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireSession } from "@/lib/server/session";
import { selectOrganization } from "@/features/organizations/service";
import { selectOrganizationSchema } from "@/validation/organization";
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    return selectOrganization(await requireSession(), await readJson(request, selectOrganizationSchema));
  });
}
