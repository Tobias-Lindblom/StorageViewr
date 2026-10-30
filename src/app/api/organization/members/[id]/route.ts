import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import {
  removeOrganizationMember,
  updateOrganizationMember,
} from "@/features/organizations/members";
import { updateMemberSchema } from "@/validation/membership";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return api(async () => {
    assertOrigin(request);
    return updateOrganizationMember(
      await requireTenant(),
      (await params).id,
      await readJson(request, updateMemberSchema),
    );
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return api(async () => {
    assertOrigin(request);
    return removeOrganizationMember(await requireTenant(), (await params).id);
  });
}
