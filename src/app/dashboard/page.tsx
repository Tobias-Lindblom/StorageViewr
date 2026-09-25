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
        description="Lager, platser, produkter och inventeringar, samlade på ett ställe."
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

      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
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
          {
            label: "Pågående inventeringar",
            value: dashboard.activeInventoryCount,
            href: "/inventories",
            icon: "inventory" as const,
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="panel p-4! transition hover:border-accent/60 sm:p-6!"
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

      {dashboard.activeInventories.length > 0 && (
        <section aria-labelledby="active-inventories-heading">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 id="active-inventories-heading" className="mb-0! text-xl!">
              Pågående inventeringar
            </h2>
            <Link
              href="/inventories"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm text-cyan"
            >
              Visa alla
              <MaterialArrow />
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            {dashboard.activeInventories.map((inventory) => (
              <Link
                key={inventory.id}
                href={"/inventories/" + inventory.id}
                className="block border-b border-line/60 p-5 transition last:border-0 hover:bg-surface-raised sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="mb-0! wrap-break-word text-base!">
                      {inventory.name}
                    </h3>
                    <p className="mt-1 text-xs text-muted">
                      {inventory.warehouseName}
                    </p>
                  </div>
                  <MaterialArrow className="mt-0.5 text-accent" />
                </div>
                <div className="mt-5 flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted">Framsteg</span>
                  <strong className="font-medium tabular-nums">
                    {inventory.counted} av {inventory.total} platser
                  </strong>
                </div>
                <progress
                  aria-label={"Framsteg för " + inventory.name}
                  value={inventory.counted}
                  max={inventory.total || 1}
                  className="mt-3 h-1.5 w-full accent-violet-500"
                />
              </Link>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
