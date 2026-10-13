import { AppShell } from "@/components/app-shell";
import { pageTenant } from "@/lib/server/page-auth";
import { getDashboard } from "@/features/dashboard/service";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import { listLocations } from "@/features/locations/service";
import { listWarehouses } from "@/features/warehouses/service";

export default async function DashboardPage() {
  const context = await pageTenant();
  const [dashboard, locations, warehouses] = await Promise.all([
    getDashboard(context),
    listLocations({ ...context, role: "warehouse" }),
    listWarehouses({ ...context, role: "warehouse" }),
  ]);
  return (
    <AppShell context={context}>
      <DashboardView dashboard={dashboard} locations={locations} warehouses={warehouses} admin={context.role === "admin"} />
    </AppShell>
  );
}
