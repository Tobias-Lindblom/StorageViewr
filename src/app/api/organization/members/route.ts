import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { createOrganizationInvitation, listOrganizationMembers } from "@/features/organizations/members";
import { createInvitationSchema } from "@/validation/membership";

export async function GET(request: Request) {
  return api(request, async () => listOrganizationMembers(await requireTenant()));
}

export async function POST(request: Request) {
  return api(request, async () => {
    assertOrigin(request);
    return createOrganizationInvitation(await requireTenant(), await readJson(request, createInvitationSchema));
  }, 201);
}
