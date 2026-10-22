import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { ReportsOverview } from "@/features/reports/reports-overview";
import { listInventories } from "@/features/inventory/session-queries";
import { getLocationStockReport } from "@/features/locations/report-data";
import { listWarehouses } from "@/features/warehouses/service";
import { pageResource } from "@/lib/server/page-resource";
import { pageTenant } from "@/lib/server/page-auth";
import { getDiscrepancyReport, getHealthReport } from "@/features/reports/operational-report-data";

export default async function ReportsPage({ searchParams }: {
  searchParams: Promise<{ warehouseId?: string; page?: string }>;
}) {
  const context = await pageTenant();
  const query = await searchParams;
  const [warehouses, inventories, valuation, discrepancies, health] = await Promise.all([
    listWarehouses(context),
    pageResource(() => listInventories(context, query.page ?? 1, "completed")),
    pageResource(() => getLocationStockReport(context, query.warehouseId)),
    context.role === "admin" ? pageResource(() => getDiscrepancyReport(context)) : Promise.resolve(null),
    context.role === "admin" ? pageResource(() => getHealthReport(context)) : Promise.resolve(null),
  ]);
  return <AppShell context={context}>
    <PageHeading title="Rapporter & dokument" description="Samla lagervärde och färdiga inventeringsunderlag på ett ställe." />
    <ReportsOverview warehouses={warehouses} warehouseId={query.warehouseId} valuation={valuation}
      inventories={inventories} discrepancies={discrepancies} health={health} />
  </AppShell>;
}
