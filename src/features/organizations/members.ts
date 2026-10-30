import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Types, type ClientSession } from "mongoose";
import { OrganizationInvitation } from "@/models/organization-invitation";
import { Organization } from "@/models/organization";
import { Membership } from "@/models/membership";
import { Session } from "@/models/session";
import { User } from "@/models/user";
import { connectDb } from "@/lib/server/db";
import { AppError } from "@/lib/server/errors";
import { requireAdmin, type TenantContext } from "@/lib/server/tenant";
import type { resolveSession } from "@/lib/server/session";
import {
  createInvitationSchema,
  invitationIdSchema,
  invitationTokenSchema,
  membershipIdSchema,
  updateMemberSchema,
} from "@/validation/membership";

const INVITATION_LIFETIME = 7 * 86400_000;
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
type AuthSession = Awaited<ReturnType<typeof resolveSession>>;

function invitationUrl(token: string) {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new AppError(503, "NOT_CONFIGURED", "Applikationen är inte konfigurerad.");
  return new URL("/invite/" + token, appUrl).toString();
}

export async function listOrganizationMembers(context: TenantContext) {
  requireAdmin(context);
  const [memberships, invitations] = await Promise.all([
    Membership.find({ organizationId: context.organizationId }).sort({ createdAt: 1 }).lean(),
    OrganizationInvitation.find({ organizationId: context.organizationId, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 }).lean(),
  ]);
  const users = await User.find({ _id: { $in: memberships.map(item => item.userId) } })
    .select("name email").lean();
  const byId = new Map(users.map(user => [user._id.toString(), user]));
  return {
    members: memberships.flatMap(membership => {
      const user = byId.get(membership.userId.toString());
      return user ? [{
        id: membership._id.toString(),
        name: user.name,
        email: user.email,
        role: membership.role,
        current: membership.userId.equals(context.userId),
      }] : [];
    }),
    invitations: invitations.map(invitation => ({
      id: invitation._id.toString(),
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
    })),
  };
}

export async function createOrganizationInvitation(context: TenantContext, input: unknown) {
  requireAdmin(context);
  const data = createInvitationSchema.parse(input);
  const user = await User.findOne({ email: data.email }).select("_id").lean();
  if (user && await Membership.exists({ organizationId: context.organizationId, userId: user._id })) {
    throw new AppError(409, "ALREADY_MEMBER", "Personen är redan medlem i företaget.");
  }
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITATION_LIFETIME);
  const invitation = await OrganizationInvitation.findOneAndUpdate(
    { organizationId: context.organizationId, email: data.email },
    { $set: { role: data.role, tokenHash: tokenHash(token), invitedBy: context.userId, expiresAt } },
    { upsert: true, returnDocument: "after", runValidators: true },
  );
  return {
    id: invitation._id.toString(),
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt.toISOString(),
    inviteUrl: invitationUrl(token),
  };
}

export async function revokeOrganizationInvitation(context: TenantContext, id: unknown) {
  requireAdmin(context);
  const invitationId = invitationIdSchema.parse(id);
  const result = await OrganizationInvitation.deleteOne({ _id: invitationId, organizationId: context.organizationId });
  if (!result.deletedCount) throw new AppError(404, "INVITATION_NOT_FOUND", "Inbjudan kunde inte hittas.");
  return { revoked: true };
}

async function lockMemberships(context: TenantContext, transaction: ClientSession) {
  const organization = await Organization.findOneAndUpdate(
    { _id: context.organizationId },
    { $inc: { membershipRevision: 1 } },
    { session: transaction, returnDocument: "after" },
  );
  if (!organization) throw new AppError(404, "ORGANIZATION_NOT_FOUND", "Företaget kunde inte hittas.");
  const actor = await Membership.exists({
    organizationId: context.organizationId,
    userId: context.userId,
    role: "admin",
  }).session(transaction);
  if (!actor) throw new AppError(403, "FORBIDDEN", "Åtgärden kräver administratör.");
}

export async function updateOrganizationMember(context: TenantContext, id: unknown, input: unknown) {
  requireAdmin(context);
  const membershipId = membershipIdSchema.parse(id);
  const data = updateMemberSchema.parse(input);
  const db = await connectDb();
  return db.connection.transaction(async transaction => {
    await lockMemberships(context, transaction);
    const membership = await Membership.findOne({
      _id: membershipId,
      organizationId: context.organizationId,
    }).session(transaction);
    if (!membership) throw new AppError(404, "MEMBER_NOT_FOUND", "Medlemmen kunde inte hittas.");
    if (membership.userId.equals(context.userId)) {
      throw new AppError(409, "SELF_MEMBERSHIP_CHANGE", "Du kan inte ändra din egen behörighet.");
    }
    membership.role = data.role;
    await membership.save({ session: transaction });
    return { id: membership._id.toString(), role: membership.role };
  });
}

export async function removeOrganizationMember(context: TenantContext, id: unknown) {
  requireAdmin(context);
  const membershipId = membershipIdSchema.parse(id);
  const db = await connectDb();
  return db.connection.transaction(async transaction => {
    await lockMemberships(context, transaction);
    const membership = await Membership.findOne({
      _id: membershipId,
      organizationId: context.organizationId,
    }).session(transaction);
    if (!membership) throw new AppError(404, "MEMBER_NOT_FOUND", "Medlemmen kunde inte hittas.");
    if (membership.userId.equals(context.userId)) {
      throw new AppError(409, "SELF_MEMBERSHIP_CHANGE", "Du kan inte ta bort ditt eget medlemskap.");
    }
    const removed = await Membership.deleteOne({
      _id: membership._id,
      organizationId: context.organizationId,
    }, { session: transaction });
    if (!removed.deletedCount) throw new AppError(409, "MEMBER_CHANGED", "Medlemskapet har redan ändrats.");
    await Session.updateMany(
      { userId: membership.userId, organizationId: context.organizationId },
      { $unset: { organizationId: 1 } },
      { session: transaction },
    );
    return { id: membership._id.toString(), removed: true };
  });
}

async function invitationDocument(rawToken: unknown) {
  await connectDb();
  const token = invitationTokenSchema.parse(rawToken);
  const invitation = await OrganizationInvitation.findOne({
    tokenHash: tokenHash(token),
    expiresAt: { $gt: new Date() },
  });
  if (!invitation) throw new AppError(404, "INVITATION_NOT_FOUND", "Inbjudan är ogiltig eller har gått ut.");
  return { token, invitation };
}

export async function getOrganizationInvitation(rawToken: unknown) {
  const { invitation } = await invitationDocument(rawToken);
  const organization = await Organization.findById(invitation.organizationId).select("name").lean();
  if (!organization) throw new AppError(404, "INVITATION_NOT_FOUND", "Inbjudan är ogiltig eller har gått ut.");
  return {
    organizationName: organization.name,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt.toISOString(),
  };
}

export async function acceptOrganizationInvitation(session: AuthSession, rawToken: unknown) {
  const { invitation } = await invitationDocument(rawToken);
  const user = await User.findById(session.userId).select("email").lean();
  if (!user) throw new AppError(401, "UNAUTHENTICATED", "Logga in igen.");
  if (user.email !== invitation.email) {
    throw new AppError(403, "INVITATION_EMAIL_MISMATCH", `Inbjudan gäller ${invitation.email}. Logga in med rätt konto.`);
  }
  const db = await connectDb();
  await db.connection.transaction(async transaction => {
    await Membership.updateOne(
      { organizationId: invitation.organizationId, userId: user._id },
      { $setOnInsert: { role: invitation.role } },
      { upsert: true, session: transaction },
    );
    const removed = await OrganizationInvitation.deleteOne({ _id: invitation._id }, { session: transaction });
    if (!removed.deletedCount) throw new AppError(409, "INVITATION_USED", "Inbjudan har redan använts.");
    await Session.updateOne(
      { _id: session._id, userId: user._id, expiresAt: { $gt: new Date() } },
      { $set: { organizationId: invitation.organizationId } },
      { session: transaction },
    );
  });
  return { organizationId: invitation.organizationId.toString() };
}

export async function registerFromOrganizationInvitation(input: {
  token: string; email: string; name: string; passwordHash: string;
}) {
  const { invitation } = await invitationDocument(input.token);
  if (input.email !== invitation.email) {
    throw new AppError(403, "INVITATION_EMAIL_MISMATCH", `Inbjudan gäller ${invitation.email}.`);
  }
  if (await User.exists({ email: input.email })) {
    throw new AppError(409, "ACCOUNT_EXISTS", "Det finns redan ett konto med e-postadressen. Logga in för att acceptera inbjudan.");
  }
  const db = await connectDb();
  return db.connection.transaction(async transaction => {
    const [user] = await User.create([{ email: input.email, name: input.name, passwordHash: input.passwordHash }], { session: transaction });
    await Membership.create([{
      organizationId: invitation.organizationId,
      userId: user._id,
      role: invitation.role,
    }], { session: transaction });
    const removed = await OrganizationInvitation.deleteOne({ _id: invitation._id }, { session: transaction });
    if (!removed.deletedCount) throw new AppError(409, "INVITATION_USED", "Inbjudan har redan använts.");
    return { userId: user._id, organizationId: new Types.ObjectId(invitation.organizationId) };
  });
}
