import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { POST } from "../src/app/api/pilot-requests/route";
import { connectDb } from "../src/lib/server/db";
import { createPilotRequest } from "../src/features/pilot/service";
import { Organization } from "../src/models/organization";
import { PilotRequest } from "../src/models/pilot-request";
import { RateLimit } from "../src/models/rate-limit";
import { User } from "../src/models/user";
import { pilotRequestSchema } from "../src/validation/pilot-request";

let replica: MongoMemoryReplSet;

const validRequest = {
  name: "  Anna Andersson  ",
  companyName: "  Testbolaget AB  ",
  email: "  ANNA@EXAMPLE.COM  ",
  phone: "070 123 45 67",
  businessType: "Grossist",
  productRange: "50–250",
  locationRange: "10–50",
  currentSystem: "Excel / kalkylblad",
  needs: ["Lagersaldo", "Inventering"],
  description: "Vi vill förenkla inventeringen.",
  website: "",
};

before(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = replica.getUri();
  process.env.MONGODB_DB = "storageviewr_pilot_test";
  process.env.APP_URL = "http://localhost:3000";
  await connectDb();
  for (const model of [PilotRequest, RateLimit, User, Organization]) {
    await model.createCollection();
    await model.createIndexes();
  }
});

after(async () => {
  const mongoose = await connectDb();
  await mongoose.disconnect();
  await replica?.stop();
});

test("pilot validation normalizes contact details and rejects untrusted fields", () => {
  const parsed = pilotRequestSchema.parse(validRequest);
  assert.equal(parsed.name, "Anna Andersson");
  assert.equal(parsed.companyName, "Testbolaget AB");
  assert.equal(parsed.email, "anna@example.com");
  assert.equal(parsed.website, undefined);

  for (const invalid of [
    { ...validRequest, email: "inte-en-adress" },
    { ...validRequest, businessType: "Ogiltig typ" },
    { ...validRequest, name: "" },
    { ...validRequest, organizationId: "injected" },
    { ...validRequest, status: "APPROVED" },
  ]) {
    assert.equal(pilotRequestSchema.safeParse(invalid).success, false);
  }
});

test("pilot requests are stored separately without creating accounts or organizations", async () => {
  const userCount = await User.countDocuments();
  const organizationCount = await Organization.countDocuments();

  assert.deepEqual(await createPilotRequest(validRequest), { received: true });

  const request = await PilotRequest.findOne({ email: "anna@example.com" });
  assert.ok(request);
  assert.equal(request.name, "Anna Andersson");
  assert.equal(request.companyName, "Testbolaget AB");
  assert.equal(request.status, "NEW");
  assert.deepEqual(request.needs, ["Lagersaldo", "Inventering"]);
  assert.equal(await User.countDocuments(), userCount);
  assert.equal(await Organization.countDocuments(), organizationCount);
});

test("honeypot submissions receive a neutral response without being persisted", async () => {
  const beforeCount = await PilotRequest.countDocuments();
  assert.deepEqual(
    await createPilotRequest({ ...validRequest, website: "spam.example" }),
    { received: true },
  );
  assert.equal(await PilotRequest.countDocuments(), beforeCount);
});

test("pilot endpoint enforces origin, validation and request limits", async () => {
  const request = (body: unknown, ip: string, origin = "http://localhost:3000") =>
    new Request("http://localhost:3000/api/pilot-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin,
        "x-real-ip": ip,
      },
      body: JSON.stringify(body),
    });

  assert.equal(
    (await POST(request(validRequest, "198.51.100.1", "https://evil.example"))).status,
    403,
  );
  assert.equal(
    (await POST(request({ ...validRequest, email: "ogiltig" }, "198.51.100.2"))).status,
    400,
  );

  for (let index = 0; index < 5; index += 1) {
    const response = await POST(
      request(
        { ...validRequest, email: `api-${index}@example.com` },
        "198.51.100.3",
      ),
    );
    assert.equal(response.status, 201);
  }
  assert.equal(
    (
      await POST(
        request(
          { ...validRequest, email: "api-limited@example.com" },
          "198.51.100.3",
        ),
      )
    ).status,
    429,
  );
});
