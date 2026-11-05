import "server-only";
import { Membership } from "@/models/membership";
import { Organization } from "@/models/organization";
import { requireSession, resolveSession } from "./session";
import { AppError } from "./errors";
import { setRequestLogActor } from "./logger";

export async function tenantForSession(
  session: Awaited<ReturnType<typeof resolveSession>>,
) {
  if (!session.organizationId)
    throw new AppError(
      409,
      "ORGANIZATION_REQUIRED",
      "Välj eller skapa ett företag.",
    );
  const [membership, organization] = await Promise.all([
    Membership.findOne({
      organizationId: session.organizationId,
      userId: session.userId,
    }).lean(),
    Organization.exists({ _id: session.organizationId }),
  ]);
  if (!membership || !organization) {
    throw new AppError(403, "FORBIDDEN", "Du saknar åtkomst till företaget.");
  }
  setRequestLogActor({
    userId: String(session.userId),
    organizationId: String(membership.organizationId),
  });
  return {
    userId: session.userId,
    organizationId: membership.organizationId,
    role: membership.role,
  };
}
export async function requireTenant() {
  return tenantForSession(await requireSession());
}
export type TenantContext = Awaited<ReturnType<typeof requireTenant>>;
export function requireAdmin(context: TenantContext) {
  if (context.role !== "admin")
    throw new AppError(403, "FORBIDDEN", "Åtgärden kräver administratör.");
}
