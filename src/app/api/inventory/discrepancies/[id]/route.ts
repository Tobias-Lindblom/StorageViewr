import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { rateLimit } from "@/lib/server/rate-limit";
import { discrepancyActionSchema } from "@/validation/discrepancy";
import { updateDiscrepancy } from "@/features/inventory/discrepancies";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return api(async () => {
    assertOrigin(request);
    const context = await requireTenant();
    await rateLimit("inventory:discrepancy:" + context.userId, 40);
    const { id } = await params;
    return updateDiscrepancy(context, id, await readJson(request, discrepancyActionSchema));
  });
}
