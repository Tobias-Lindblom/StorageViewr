import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { ReportsOverview } from "@/features/reports/reports-overview";
import { listInventories } from "@/features/inventory/session-queries";
import { getLocationStockReport } from "@/features/locations/report-data";
import { listWarehouses } from "@/features/warehouses/service";
import { pageResource } from "@/lib/server/page-resource";
import { pageTenant } from "@/lib/server/page-auth";

export default async function ReportsPage({ searchParams }: {
  searchParams: Promise<{ warehouseId?: string; page?: string }>;
}) {
  const context = await pageTenant();
  const query = await searchParams;
  const [warehouses, inventories, valuation] = await Promise.all([
    listWarehouses(context),
    pageResource(() => listInventories(context, query.page ?? 1, "completed")),
    pageResource(() => getLocationStockReport(context, query.warehouseId)),
  ]);
  return <AppShell context={context}>
    <PageHeading title="Rapporter & dokument" description="Samla lagervärde och färdiga inventeringsunderlag på ett ställe." />
    <ReportsOverview warehouses={warehouses} warehouseId={query.warehouseId} valuation={valuation} inventories={inventories} />
  </AppShell>;
}
