import { api, assertOrigin } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { revokeOrganizationInvitation } from "@/features/organizations/members";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return api(async () => {
    assertOrigin(request);
    return revokeOrganizationInvitation(await requireTenant(), (await params).id);
  });
}
