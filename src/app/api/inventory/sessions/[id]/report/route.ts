import { api } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { rateLimit } from "@/lib/server/rate-limit";
import { getInventoryReport } from "@/features/inventory/report-data";
import {
  inventoryReportFilename,
  renderInventoryReport,
} from "@/features/inventory/report-pdf";

export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireTenant();
    await rateLimit("inventory:pdf:" + context.userId, 10, 60_000);
    const report = await getInventoryReport(context, (await params).id);
    const bytes = await renderInventoryReport(report);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="' + inventoryReportFilename(report) + '"',
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
