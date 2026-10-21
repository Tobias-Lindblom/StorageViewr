import { api, assertOrigin } from "@/lib/server/api";
import { requireSession } from "@/lib/server/session";
import { acceptOrganizationInvitation } from "@/features/organizations/members";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return api(async () => {
    assertOrigin(request);
    return acceptOrganizationInvitation(await requireSession(), (await params).token);
  });
}
