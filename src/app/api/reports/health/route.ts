import { api } from "@/lib/server/api";
import { requireTenant } from "@/lib/server/tenant";
import { rateLimit } from "@/lib/server/rate-limit";
import { getHealthReport } from "@/features/reports/operational-report-data";
import { renderHealthReport } from "@/features/reports/operational-report-pdf";

export const runtime = "nodejs";

export async function GET() {
  try {
    const context = await requireTenant();
    await rateLimit("reports:health:" + context.userId, 10, 60_000);
    const bytes = await renderHealthReport(await getHealthReport(context));
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="lagerhalsorapport.pdf"',
      "Content-Length": String(bytes.length), "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "same-origin",
    } });
  } catch (error) { return api(async () => { throw error; }); }
}
