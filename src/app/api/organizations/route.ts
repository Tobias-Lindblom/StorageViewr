import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireSession } from "@/lib/server/session";
import { rateLimit } from "@/lib/server/rate-limit";
import { listOrganizations, createOrganization } from "@/features/organizations/service";
import { organizationSchema } from "@/validation/organization";
export async function GET() {
  return api(async () => listOrganizations(await requireSession()));
}
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const session = await requireSession();
    await rateLimit("organization:create:" + session.userId, 10);
    return createOrganization(session, await readJson(request, organizationSchema));
  }, 201);
}
