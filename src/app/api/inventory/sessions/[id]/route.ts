import { api } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { getInventory } from "@/features/inventory/session-queries";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return api(async () => getInventory(await requireTenant(), (await params).id));
}
