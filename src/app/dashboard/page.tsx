import { AppShell } from "@/components/app-shell";
import { ScannerRouteEntry } from "@/features/scanner/scanner-route-entry";
import { pageTenant } from "@/lib/server/page-auth";
import { getDashboard } from "@/features/dashboard/service";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import { listLocations } from "@/features/locations/service";
import { listWarehouses } from "@/features/warehouses/service";
import { getAccount } from "@/features/account/service";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ scan?: string | string[] }> }) {
  const { scan } = await searchParams;
  const context = await pageTenant();
  const [dashboard, locations, warehouses, account] = await Promise.all([
    getDashboard(context),
    listLocations({ ...context, role: "warehouse" }),
    listWarehouses({ ...context, role: "warehouse" }),
    getAccount(context),
  ]);
  return (
    <AppShell context={context} account={account} contentClassName="dashboard-content">
      {scan === "1" && <ScannerRouteEntry />}
      <DashboardView dashboard={dashboard} locations={locations} warehouses={warehouses}
        admin={context.role === "admin"} accountName={account.name} />
    </AppShell>
  );
}
