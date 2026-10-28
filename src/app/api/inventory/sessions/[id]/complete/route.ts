import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { rateLimit } from "@/lib/server/rate-limit";
import { finishInventory } from "@/features/inventory/sessions";
import { z } from "zod";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    assertOrigin(request);
    const context = await requireTenant();
    await rateLimit("inventory:finish:" + context.userId, 30);
    return finishInventory(
      context,
      (await params).id,
      // finishInventory owns validation and normalization. Reading the bounded
      // JSON as unknown avoids applying transformed money fields twice.
      await readJson(request, z.unknown(), 450_000),
    );
  });
}
