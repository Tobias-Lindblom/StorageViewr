import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Types } from "mongoose";
import { connectDb } from "../src/lib/server/db";
import { User } from "../src/models/user";
import { Organization } from "../src/models/organization";
import { Membership } from "../src/models/membership";
import { Session } from "../src/models/session";
import { RateLimit } from "../src/models/rate-limit";
import { OrganizationInvitation } from "../src/models/organization-invitation";
import { register, login } from "../src/features/auth/service";
import {
  assertRegistrationEnabled,
  registrationEnabled,
} from "../src/features/auth/registration";
import {
  createOrganization,
  selectOrganization,
  listOrganizations,
  updateOrganization,
  getOrganization,
} from "../src/features/organizations/service";
import { createSession, resolveSession } from "../src/lib/server/session";
import { tenantForSession } from "../src/lib/server/tenant";
import { AppError } from "../src/lib/server/errors";
import { rateLimit } from "../src/lib/server/rate-limit";
import { api, assertOrigin, readJson } from "../src/lib/server/api";
import { registerSchema } from "../src/validation/auth";
import {
  acceptOrganizationInvitation,
  createOrganizationInvitation,
  getOrganizationInvitation,
  listOrganizationMembers,
  revokeOrganizationInvitation,
} from "../src/features/organizations/members";
import {
  objectIdSchema,
  quantitySchema,
  updateOrganizationSchema,
} from "../src/validation/organization";

let replica: MongoMemoryReplSet;
before(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = replica.getUri();
  process.env.MONGODB_DB = "storageviewr_test";
  process.env.APP_URL = "http://localhost:3000";
  process.env.REGISTRATION_ENABLED = "true";
  await connectDb();
  for (const model of [User, Organization, Membership, Session, RateLimit, OrganizationInvitation]) {
    await model.createCollection();
    await model.createIndexes();
  }
});
after(async () => {
  const mongoose = await connectDb();
  await mongoose.disconnect();
  await replica?.stop();
});

const hasStatus = (status: number) => (error: unknown) =>
  error instanceof AppError && error.status === status;

test("registration is closed by default in production and can be configured explicitly", () => {
  assert.equal(registrationEnabled({ NODE_ENV: "development" }), true);
  assert.equal(registrationEnabled({ NODE_ENV: "production" }), false);
  assert.equal(
    registrationEnabled({
      NODE_ENV: "production",
      REGISTRATION_ENABLED: "true",
    }),
    true,
  );
  assert.equal(
    registrationEnabled({
      NODE_ENV: "development",
      REGISTRATION_ENABLED: "false",
    }),
    false,
  );
  assert.throws(
    () =>
      assertRegistrationEnabled({
        NODE_ENV: "production",
        REGISTRATION_ENABLED: "false",
      }),
    hasStatus(403),
  );
});

test("registration stores a password hash, login normalizes email, sessions expire and can be revoked", async () => {
  const input = {
    email: " ANNA@example.com ",
    name: "Anna",
    password: "Ett-langt-testlosenord-2026",
  };
  const created = await register(input);
  const session = await resolveSession(created.token);
  const stored = await User.findOne({ _id: session.userId }).select(
    "+passwordHash",
  );
  assert.equal(stored?.email, "anna@example.com");
  assert.notEqual(stored?.passwordHash, input.password);
  assert.ok(stored?.passwordHash.startsWith("scrypt-v1$"));
  assert.notEqual(session.tokenHash, created.token);
  const authenticated = await login({
    email: "ANNA@example.com",
    password: input.password,
  });
  assert.ok(
    (await resolveSession(authenticated.token)).userId.equals(session.userId),
  );
  await assert.rejects(
    login({ email: input.email, password: "incorrect" }),
    hasStatus(401),
  );
  await assert.rejects(
    login({ email: "missing@example.com", password: "incorrect" }),
    hasStatus(401),
  );
  await Session.updateOne(
    { _id: session._id },
    { $set: { expiresAt: new Date(0) } },
  );
  await assert.rejects(resolveSession(created.token), hasStatus(401));
  const active = await resolveSession(authenticated.token);
  await Session.deleteOne({ _id: active._id });
  await assert.rejects(resolveSession(authenticated.token), hasStatus(401));
  await assert.rejects(resolveSession("bad-token"), hasStatus(401));
});

test("two tenants stay isolated; role and membership changes apply immediately", async () => {
  const userA = await User.create({
    email: "a@example.com",
    name: "A",
    passwordHash: "test-only",
  });
  const userB = await User.create({
    email: "b@example.com",
    name: "B",
    passwordHash: "test-only",
  });
  const tokenA = (await createSession(userA._id)).token;
  const tokenB = (await createSession(userB._id)).token;
  const orgA = await createOrganization(await resolveSession(tokenA), {
    name: "Företag A",
    slug: "foretag-a",
  });
  const orgB = await createOrganization(await resolveSession(tokenB), {
    name: "Företag B",
    slug: "foretag-b",
  });
  assert.deepEqual(
    (await listOrganizations(await resolveSession(tokenA))).map((o) => o.id),
    [orgA.id],
  );
  await assert.rejects(
    selectOrganization(await resolveSession(tokenA), {
      organizationId: orgB.id,
    }),
    hasStatus(403),
  );
  const contextA = await tenantForSession(await resolveSession(tokenA));
  assert.equal(contextA.organizationId.toString(), orgA.id);
  await assert.rejects(
    updateOrganization(contextA, { name: "Intrång", organizationId: orgB.id }),
  );
  const documentDetails = {
    organizationNumber: "556016-0680",
    addressLine1: "Lagergatan 12",
    addressLine2: "C/o Godsmottagningen",
    postalCode: "123 45",
    city: "Stockholm",
    country: "Sverige",
    contactEmail: "info@example.com",
    phone: "08-123 45 67",
    website: "https://example.com",
  };
  await updateOrganization(contextA, { name: "Nytt namn A", ...documentDetails });
  const updatedOrganization = await getOrganization(contextA);
  assert.equal(updatedOrganization.name, "Nytt namn A");
  for (const [field, value] of Object.entries(documentDetails))
    assert.equal(updatedOrganization[field as keyof typeof documentDetails], value);
  assert.equal(
    (
      await getOrganization(
        await tenantForSession(await resolveSession(tokenB)),
      )
    ).name,
    "Företag B",
  );
  assert.equal((await getOrganization(await tenantForSession(await resolveSession(tokenB)))).organizationNumber, "");
  // The same person may legitimately be a warehouse user in another organization.
  await Membership.create({
    userId: userA._id,
    organizationId: orgB.id,
    role: "warehouse",
  });
  await selectOrganization(await resolveSession(tokenA), {
    organizationId: orgB.id,
  });
  const warehouseContext = await tenantForSession(await resolveSession(tokenA));
  assert.equal(warehouseContext.role, "warehouse");
  await assert.rejects(
    updateOrganization(warehouseContext, { name: "Otillåtet" }),
    hasStatus(403),
  );
  await Membership.deleteOne({ userId: userA._id, organizationId: orgB.id });
  await assert.rejects(
    tenantForSession(await resolveSession(tokenA)),
    hasStatus(403),
  );
  await selectOrganization(await resolveSession(tokenA), {
    organizationId: orgA.id,
  });
  await Membership.updateOne(
    { userId: userA._id, organizationId: orgA.id },
    { $set: { role: "warehouse" } },
  );
  await assert.rejects(
    updateOrganization(await tenantForSession(await resolveSession(tokenA)), {
      name: "Otillåtet",
    }),
    hasStatus(403),
  );
});

test("administrators invite members with a selected role and only the addressed account can accept", async () => {
  const owner = await User.create({ email: "invite-owner@example.com", name: "Owner", passwordHash: "test-only" });
  const recipient = await User.create({ email: "invite-worker@example.com", name: "Worker", passwordHash: "test-only" });
  const stranger = await User.create({ email: "invite-stranger@example.com", name: "Stranger", passwordHash: "test-only" });
  const ownerSession = await resolveSession((await createSession(owner._id)).token);
  const organization = await createOrganization(ownerSession, { name: "Invite AB", slug: "invite-ab" });
  const context = await tenantForSession(await resolveSession((await createSession(owner._id, new Types.ObjectId(organization.id))).token));

  const created = await createOrganizationInvitation(context, { email: " INVITE-WORKER@example.com ", role: "warehouse" });
  const token = new URL(created.inviteUrl).pathname.split("/").pop()!;
  assert.equal(created.email, "invite-worker@example.com");
  assert.equal((await getOrganizationInvitation(token)).organizationName, "Invite AB");
  const overview = await listOrganizationMembers(context);
  assert.equal(overview.members.length, 1);
  assert.equal(overview.invitations[0]?.role, "warehouse");
  assert.equal("inviteUrl" in overview.invitations[0], false);

  const strangerSession = await resolveSession((await createSession(stranger._id)).token);
  await assert.rejects(acceptOrganizationInvitation(strangerSession, token), hasStatus(403));
  const recipientSession = await resolveSession((await createSession(recipient._id)).token);
  await acceptOrganizationInvitation(recipientSession, token);
  assert.equal((await Membership.findOne({ organizationId: organization.id, userId: recipient._id }))?.role, "warehouse");
  assert.equal((await Session.findById(recipientSession._id))?.organizationId?.toString(), organization.id);
  assert.equal(await OrganizationInvitation.countDocuments({ organizationId: organization.id }), 0);

  const workerContext = await tenantForSession(await resolveSession((await createSession(recipient._id, new Types.ObjectId(organization.id))).token));
  await assert.rejects(createOrganizationInvitation(workerContext, { email: "blocked@example.com", role: "admin" }), hasStatus(403));
  await assert.rejects(listOrganizationMembers(workerContext), hasStatus(403));
});

test("a valid invitation permits account creation while public registration is closed and can be revoked", async () => {
  const owner = await User.create({ email: "closed-owner@example.com", name: "Owner", passwordHash: "test-only" });
  const organization = await Organization.create({ name: "Closed AB", slug: "closed-ab" });
  await Membership.create({ organizationId: organization._id, userId: owner._id, role: "admin" });
  const context = await tenantForSession(await resolveSession((await createSession(owner._id, organization._id)).token));
  const created = await createOrganizationInvitation(context, { email: "new-admin@example.com", role: "admin" });
  const token = new URL(created.inviteUrl).pathname.split("/").pop()!;
  process.env.REGISTRATION_ENABLED = "false";
  try {
    const registered = await register({
      email: "new-admin@example.com",
      name: "New Admin",
      password: "Ett-langt-testlosenord-2026",
      inviteToken: token,
    });
    const session = await resolveSession(registered.token);
    assert.equal(session.organizationId?.toString(), organization._id.toString());
    assert.equal((await Membership.findOne({ organizationId: organization._id, userId: session.userId }))?.role, "admin");
  } finally {
    process.env.REGISTRATION_ENABLED = "true";
  }

  const revokable = await createOrganizationInvitation(context, { email: "revoke@example.com", role: "warehouse" });
  await revokeOrganizationInvitation(context, revokable.id);
  assert.equal(await OrganizationInvitation.countDocuments({ _id: revokable.id }), 0);
});

test("organization creation rolls back if its session is invalid and unique indexes reject duplicates", async () => {
  const user = await User.create({
    email: "rollback@example.com",
    name: "Rollback",
    passwordHash: "test-only",
  });
  const token = (await createSession(user._id)).token;
  const session = await resolveSession(token);
  await Session.deleteOne({ _id: session._id });
  await assert.rejects(
    createOrganization(session, { name: "Rollback", slug: "rollback-org" }),
    hasStatus(401),
  );
  assert.equal(await Organization.countDocuments({ slug: "rollback-org" }), 0);
  assert.equal(await Membership.countDocuments({ userId: user._id }), 0);
  await assert.rejects(
    User.create({
      email: "ROLLBACK@example.com",
      name: "Duplicate",
      passwordHash: "test-only",
    }),
  );
  const organization = await Organization.create({
    name: "Unique",
    slug: "unique-org",
  });
  await Membership.create({
    organizationId: organization._id,
    userId: user._id,
    role: "admin",
  });
  await assert.rejects(
    Membership.create({
      organizationId: organization._id,
      userId: user._id,
      role: "warehouse",
    }),
  );
  await assert.rejects(
    Organization.create({ name: "Duplicate", slug: "unique-org" }),
  );
});

test("runtime validation rejects injected filters, unexpected tenant ids, unsafe quantities and weak passwords", () => {
  assert.equal(
    objectIdSchema.safeParse(new Types.ObjectId().toString()).success,
    true,
  );
  for (const value of ["invalid", { $ne: null }, "abcdefghijkl"])
    assert.equal(objectIdSchema.safeParse(value).success, false);
  for (const value of [
    NaN,
    Infinity,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
    "12",
  ])
    assert.equal(quantitySchema.safeParse(value).success, false);
  assert.equal(quantitySchema.parse(0), 0);
  assert.equal(
    updateOrganizationSchema.safeParse({
      name: "Name",
      organizationId: new Types.ObjectId().toString(),
    }).success,
    false,
  );
  for (const invalid of [
    { organizationNumber: "123" },
    { contactEmail: "inte-en-adress" },
    { website: "example.com" },
  ]) assert.equal(updateOrganizationSchema.safeParse({ name: "Name", ...invalid }).success, false);
  assert.equal(
    registerSchema.safeParse({
      name: "Anna",
      email: "a@example.com",
      password: "short",
    }).success,
    false,
  );
});

test("mutation origin checks and bounded JSON parsing reject invalid requests consistently", async () => {
  assert.throws(
    () =>
      assertOrigin(
        new Request("http://localhost:3000", {
          headers: { origin: "https://evil.example" },
        }),
      ),
    hasStatus(403),
  );
  assert.throws(
    () => assertOrigin(new Request("http://localhost:3000")),
    hasStatus(403),
  );
  assertOrigin(
    new Request("http://localhost:3000", {
      headers: { origin: "http://localhost:3000" },
    }),
  );
  const request = (body: string) =>
    new Request("http://localhost:3000", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  await assert.rejects(
    readJson(request("{"), updateOrganizationSchema),
    hasStatus(400),
  );
  await assert.rejects(
    readJson(request("x".repeat(17000)), updateOrganizationSchema),
    hasStatus(413),
  );
  const result = await api(async () => {
    throw new AppError(403, "FORBIDDEN", "Nekad");
  });
  assert.equal(result.status, 403);
  assert.deepEqual(await result.json(), {
    error: { code: "FORBIDDEN", message: "Nekad" },
  });
  assert.equal(result.headers.get("cache-control"), "no-store");
});

test("database rate limiting stays atomic under concurrent requests", async () => {
  const outcomes = await Promise.allSettled(
    Array.from({ length: 8 }, () => rateLimit("concurrent-test", 3)),
  );
  assert.equal(outcomes.filter((o) => o.status === "fulfilled").length, 3);
  assert.equal(
    outcomes.filter((o) => o.status === "rejected" && hasStatus(429)(o.reason))
      .length,
    5,
  );
});

test("account settings update only the signed-in user's name and never expose credentials", async () => {
  const { getAccount, updateAccount } =
    await import("../src/features/account/service");
  const first = await User.create({
    email: "profile-a@example.com",
    name: "Anna",
    passwordHash: "secret-test-hash",
  });
  const second = await User.create({
    email: "profile-b@example.com",
    name: "Bertil",
    passwordHash: "other-test-hash",
  });
  const session = await resolveSession((await createSession(first._id)).token);
  assert.deepEqual(await getAccount(session), {
    name: "Anna",
    email: "profile-a@example.com",
  });
  assert.deepEqual(
    await updateAccount(session, { name: "  Anna Andersson  " }),
    { name: "Anna Andersson", email: "profile-a@example.com" },
  );
  for (const input of [
    { name: "Intrång", userId: second._id.toString() },
    { name: "Intrång", email: "changed@example.com" },
    { name: "Intrång", passwordHash: "changed" },
    { name: " " },
  ]) {
    await assert.rejects(updateAccount(session, input));
  }
  assert.equal((await User.findById(second._id))?.name, "Bertil");
  assert.equal((await User.findById(first._id))?.name, "Anna Andersson");
  assert.equal(
    (await User.findById(first._id).select("+passwordHash"))?.passwordHash,
    "secret-test-hash",
  );
});
