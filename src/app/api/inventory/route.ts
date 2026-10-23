import { api } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { listStock } from "@/features/inventory/service";
export async function GET(request: Request) {
  return api(async () => listStock(await requireTenant(), Object.fromEntries(new URL(request.url).searchParams)));
}
