import { createHash } from "node:crypto";
import { createPilotRequest } from "@/features/pilot/service";
import { api, assertOrigin, readJson } from "@/lib/server/api";
import { rateLimit } from "@/lib/server/rate-limit";
import { pilotRequestSchema } from "@/validation/pilot-request";

function requestIdentity(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  const address =
    request.headers.get("x-real-ip")?.trim() || forwarded?.trim() || "unknown";
  return createHash("sha256").update(address).digest("hex");
}

export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const data = await readJson(request, pilotRequestSchema, 20_000);
    const identity = requestIdentity(request);

    await rateLimit("pilot-request:global", 200, 60 * 60_000);
    await rateLimit("pilot-request:ip:" + identity, 5, 60 * 60_000);
    await rateLimit(
      "pilot-request:email:" + data.email,
      3,
      24 * 60 * 60_000,
    );

    return createPilotRequest(data);
  }, 201);
}

