import { api, assertOrigin } from "@/lib/server/api";
import { logout } from "@/lib/server/session";
export async function POST(request: Request) {
  return api(async () => { assertOrigin(request); await logout(); return { authenticated: false }; });
}
