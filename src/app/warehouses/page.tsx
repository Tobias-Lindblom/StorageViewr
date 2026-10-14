import { AppShell } from "@/components/app-shell";
import { pageTenant } from "@/lib/server/page-auth";
import { listWarehouses } from "@/features/warehouses/service";
import { WarehouseOverview } from "@/features/warehouses/warehouse-overview";

export default async function WarehousesPage() {
  const context = await pageTenant();
  const warehouses = await listWarehouses(context);
  return (
    <AppShell context={context}>
      <WarehouseOverview warehouses={warehouses} admin={context.role === "admin"} />
    </AppShell>
  );
}
