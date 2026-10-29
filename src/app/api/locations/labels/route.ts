import { api } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { rateLimit } from "@/lib/server/rate-limit";
import { AppError } from "@/lib/server/errors";
import { getLabels } from "@/features/locations/labels";
import {
  locationLabelsFilename,
  renderLocationLabelsPdf,
} from "@/features/locations/labels-pdf";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const context = await requireTenant();
    await rateLimit("locations:labels-pdf:" + context.userId, 10, 60_000);
    const warehouseId =
      new URL(request.url).searchParams.get("warehouseId") ?? undefined;
    const labels = await getLabels(context, warehouseId);
    if (!labels.length)
      throw new AppError(404, "NO_LABELS", "Det finns inga etiketter att skriva ut.");
    const bytes = await renderLocationLabelsPdf(labels);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'inline; filename="' + locationLabelsFilename(labels) + '"',
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error) {
    return api(async () => {
      throw error;
    });
  }
}
