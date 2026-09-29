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
        description="Aktuell status för företagets lager."
        action={
          admin && !hasWarehouses ? (
            <Link className="button" href="/warehouses/new">
              Lägg till lager
            </Link>
          ) : hasWarehouses && (!admin || dashboard.locationCount === 0) ? (
            admin ? (
              <Link className="button" href="/locations/new">
                Skapa lagerplatser
              </Link>
            ) : (
              <Link className="button" href="/locations">
                Visa lagerplatser
              </Link>
            )
          ) : undefined
        }
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section aria-labelledby="warehouse-status-heading">
          <h2 id="warehouse-status-heading" className="mb-4! text-xl!">
            Lagerstatus
          </h2>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
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
                className="group flex min-h-20 items-center gap-4 border-b border-line/60 px-5 py-4 transition last:border-0 hover:bg-surface-raised sm:px-6"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-accent ring-1 ring-inset ring-violet-400/15">
                  <AppIcon name={item.icon} />
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium">
                  {item.label}
                </span>
                <strong className="text-2xl font-semibold tabular-nums">
                  {item.value}
                </strong>
                <MaterialArrow
                  size={18}
                  className="text-muted transition group-hover:translate-x-0.5 group-hover:text-accent"
                />
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="active-inventories-heading">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 id="active-inventories-heading" className="mb-0! text-xl!">
                Inventering
              </h2>
              {dashboard.activeInventoryCount > 0 && (
                <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-xs font-medium tabular-nums text-accent">
                  {dashboard.activeInventoryCount} pågående
                </span>
              )}
            </div>
            {dashboard.activeInventoryCount > 0 && (
              <Link
                href="/inventories"
                className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm text-cyan"
              >
                Visa alla
                <MaterialArrow />
              </Link>
            )}
          </div>
          {dashboard.activeInventories.length > 0 ? (
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
          ) : (
            <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-muted">
                  <AppIcon name="inventory" />
                </span>
                <div>
                  <h3 className="mb-1! text-base!">
                    Ingen pågående inventering
                  </h3>
                  <p className="text-sm leading-6 text-muted">
                    {admin
                      ? "Starta en inventering när lagersaldot ska kontrolleras."
                      : "Det finns ingen inventering att arbeta med just nu."}
                  </p>
                </div>
              </div>
              <Link
                href="/inventories"
                className="button-secondary mt-5 w-full gap-2 sm:w-auto"
              >
                {admin ? "Starta inventering" : "Visa inventeringar"}
                <MaterialArrow />
              </Link>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
