import { api } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { rateLimit } from "@/lib/server/rate-limit";
import { getLocationStockReport } from "@/features/locations/report-data";
import {
  locationStockReportFilename,
  renderLocationStockReport,
} from "@/features/locations/report-pdf";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const context = await requireTenant();
    await rateLimit("locations:pdf:" + context.userId, 10, 60_000);
    const warehouseId =
      new URL(request.url).searchParams.get("warehouseId") ?? undefined;
    const report = await getLocationStockReport(context, warehouseId);
    const bytes = await renderLocationStockReport(report);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="' + locationStockReportFilename(report) + '"',
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
