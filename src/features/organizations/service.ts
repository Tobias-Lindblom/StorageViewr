import "server-only";
import { Organization } from "@/models/organization";
import { Membership } from "@/models/membership";
import { Session } from "@/models/session";
import { connectDb } from "@/lib/server/db";
import { AppError } from "@/lib/server/errors";
import { requireAdmin, type TenantContext } from "@/lib/server/tenant";
import { resolveSession } from "@/lib/server/session";
import {
  organizationSchema,
  selectOrganizationSchema,
  updateOrganizationSchema,
} from "@/validation/organization";

type AuthSession = Awaited<ReturnType<typeof resolveSession>>;
export async function listOrganizations(session: AuthSession) {
  const memberships = await Membership.find({ userId: session.userId }).lean();
  const organizations = await Organization.find({
    _id: { $in: memberships.map((m) => m.organizationId) },
  }).lean();
  return organizations.map((o) => ({
    id: o._id.toString(),
    name: o.name,
    slug: o.slug,
    role: memberships.find((m) => m.organizationId.equals(o._id))!.role,
  }));
}
export async function createOrganization(session: AuthSession, input: unknown) {
  const data = organizationSchema.parse(input);
  const db = await connectDb();
  return db.connection.transaction(async (transaction) => {
    const [organization] = await Organization.create([data], {
      session: transaction,
    });
    await Membership.create(
      [
        {
          organizationId: organization._id,
          userId: session.userId,
          role: "admin",
        },
      ],
      { session: transaction },
    );
    const result = await Session.updateOne(
      {
        _id: session._id,
        userId: session.userId,
        expiresAt: { $gt: new Date() },
      },
      { $set: { organizationId: organization._id } },
      { session: transaction },
    );
    if (!result.matchedCount)
      throw new AppError(401, "UNAUTHENTICATED", "Logga in igen.");
    return { id: organization._id.toString(), name: organization.name };
  });
}
export async function selectOrganization(session: AuthSession, input: unknown) {
  const { organizationId } = selectOrganizationSchema.parse(input);
  const membership = await Membership.findOne({
    organizationId,
    userId: session.userId,
  }).lean();
  if (
    !membership ||
    !(await Organization.exists({ _id: membership.organizationId }))
  ) {
    throw new AppError(403, "FORBIDDEN", "Du saknar åtkomst till företaget.");
  }
  const result = await Session.updateOne(
    {
      _id: session._id,
      userId: session.userId,
      expiresAt: { $gt: new Date() },
    },
    { $set: { organizationId: membership.organizationId } },
  );
  if (!result.matchedCount)
    throw new AppError(401, "UNAUTHENTICATED", "Logga in igen.");
  return { id: membership.organizationId.toString() };
}
export async function getOrganization(context: TenantContext) {
  const organization = await Organization.findOne({
    _id: context.organizationId,
  }).lean();
  if (!organization)
    throw new AppError(
      404,
      "ORGANIZATION_NOT_FOUND",
      "Företaget kunde inte hittas.",
    );
  return {
    id: organization._id.toString(),
    name: organization.name,
    slug: organization.slug,
    role: context.role,
  };
}
export async function updateOrganization(
  context: TenantContext,
  input: unknown,
) {
  requireAdmin(context);
  const data = updateOrganizationSchema.parse(input);
  const organization = await Organization.findOneAndUpdate(
    { _id: context.organizationId },
    { $set: data },
    { returnDocument: "after", runValidators: true },
  ).lean();
  if (!organization)
    throw new AppError(
      404,
      "ORGANIZATION_NOT_FOUND",
      "Företaget kunde inte hittas.",
    );
  return { id: organization._id.toString(), name: organization.name };
}
