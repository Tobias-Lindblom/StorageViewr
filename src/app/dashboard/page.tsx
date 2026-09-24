import { MaterialArrow } from "@/components/material-arrow";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AppIcon } from "@/components/app-icon";
import { PageHeading } from "@/components/page-heading";
import { pageTenant } from "@/lib/server/page-auth";
import { getDashboard } from "@/features/dashboard/service";

export default async function DashboardPage() {
  const context = await pageTenant();
  const dashboard = await getDashboard(context);
  const admin = context.role === "admin";
  const hasWarehouses = dashboard.warehouseCount > 0;

  return (
    <AppShell context={context}>
      <PageHeading
        title="Översikt"
        description="Lager, platser och produkter, samlade på ett ställe."
        action={
          hasWarehouses && (!admin || dashboard.locationCount === 0) ? (
            admin ? (
              <Link className="button" href="/locations/new">
                Skapa lagerplatser{" "}
                <span aria-hidden="true">
                  <MaterialArrow name="forward" />
                </span>
              </Link>
            ) : (
              <Link className="button" href="/locations">
                Visa lagerplatser
              </Link>
            )
          ) : undefined
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
        {[
          {
            label: "Aktiva lager",
            value: dashboard.warehouseCount,
            href: "/warehouses",
            icon: "warehouse" as const,
          },
          {
            label: "Aktiva lagerplatser",
            value: dashboard.locationCount,
            href: "/locations",
            icon: "location" as const,
          },
          {
            label: "Aktiva produkter",
            value: dashboard.productCount,
            href: "/products",
            icon: "product" as const,
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="panel p-4! transition last:col-span-2 hover:border-accent/60 sm:p-6! sm:last:col-span-1"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="text-accent">
                <AppIcon name={item.icon} />
              </span>
              <span className="text-muted" aria-hidden="true">
                <MaterialArrow name="outward" />
              </span>
            </div>
            <p className="mb-2 text-4xl font-semibold tabular-nums">
              {item.value}
            </p>
            <p className="text-xs leading-5 text-muted sm:text-sm">
              {item.label}
            </p>
          </Link>
        ))}
      </div>


    </AppShell>
  );
}
