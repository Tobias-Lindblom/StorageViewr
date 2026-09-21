import { api, assertOrigin, readJson } from "@/lib/server/api";
import { login } from "@/features/auth/service";
import { loginSchema } from "@/validation/auth";
import { setSessionCookie } from "@/lib/server/session";

export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const session = await login(await readJson(request, loginSchema));
    await setSessionCookie(session.token, session.expiresAt);
    return { authenticated: true };
  });
}
