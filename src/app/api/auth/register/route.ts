import { api, assertOrigin, readJson } from "@/lib/server/api";
import { register } from "@/features/auth/service";
import { registerSchema } from "@/validation/auth";
import { setSessionCookie } from "@/lib/server/session";

export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const session = await register(await readJson(request, registerSchema));
    await setSessionCookie(session.token, session.expiresAt);
    return { authenticated: true };
  }, 201);
}
