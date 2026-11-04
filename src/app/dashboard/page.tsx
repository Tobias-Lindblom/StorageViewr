import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { ScannerRouteEntry } from "@/features/scanner/scanner-route-entry";
import { pageTenant } from "@/lib/server/page-auth";
import { getDashboard } from "@/features/dashboard/service";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import { listLocations } from "@/features/locations/service";
import { listWarehouses } from "@/features/warehouses/service";
import { getAccount } from "@/features/account/service";
import type { TenantContext } from "@/lib/server/tenant";

function loadDashboardPage(context: TenantContext) {
  return Promise.all([
    getDashboard(context),
    listLocations({ ...context, role: "warehouse" }),
    listWarehouses({ ...context, role: "warehouse" }),
    getAccount(context),
  ]);
}

async function DashboardContent({
  data,
  admin,
}: {
  data: ReturnType<typeof loadDashboardPage>;
  admin: boolean;
}) {
  const [dashboard, locations, warehouses, account] = await data;
  return <DashboardView
    dashboard={dashboard}
    locations={locations}
    warehouses={warehouses}
    admin={admin}
    accountName={account.name}
  />;
}

function DashboardSkeleton() {
  return <div className="warehouse-dashboard dashboard-skeleton" aria-label="Laddar lageröversikt" aria-busy="true">
    <header className="dashboard-welcome">
      <span className="dashboard-skeleton-line is-title" />
      <span className="dashboard-skeleton-line is-copy" />
    </header>
    <div className="dashboard-layout">
      <span className="dashboard-skeleton-card is-health" />
      <span className="dashboard-skeleton-card is-focus" />
      <span className="dashboard-skeleton-card is-actions" />
      <span className="dashboard-skeleton-card is-overview" />
      <span className="dashboard-skeleton-card is-activity" />
    </div>
  </div>;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ scan?: string | string[] }> }) {
  const { scan } = await searchParams;
  const context = await pageTenant();
  const data = loadDashboardPage(context);
  return (
    <AppShell context={context} contentClassName="dashboard-content">
      {scan === "1" && <ScannerRouteEntry />}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent data={data} admin={context.role === "admin"} />
      </Suspense>
    </AppShell>
  );
}
