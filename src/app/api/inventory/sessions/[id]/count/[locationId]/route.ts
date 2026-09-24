import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { rateLimit } from "@/lib/server/rate-limit";
import { saveLocationCount } from "@/features/inventory/sessions";
import { saveCountSchema } from "@/validation/inventory-session";
export async function PUT(request: Request, { params }: { params: Promise<{ id: string; locationId: string }> }) {
  return api(async () => {
    assertOrigin(request);
    const context = await requireTenant();
    await rateLimit("inventory:count:" + context.userId, 120);
    const { id, locationId } = await params;
    return saveLocationCount(context, id, locationId, await readJson(request, saveCountSchema, 100_000));
  });
}
