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

      <section
        aria-labelledby="warehouses-heading"
        className="border-t border-line/60 pt-6"
      >
        {dashboard.warehouses.length ? (
          <>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 id="warehouses-heading" className="mb-0! text-lg">
                Dina lager
              </h2>
              <Link
                href="/warehouses"
                className="inline-flex min-h-13 items-center text-xs text-cyan"
              >
                Visa alla{" "}
                <span className="ml-2" aria-hidden="true">
                  <MaterialArrow name="forward" />
                </span>
              </Link>
            </div>
            <ul className="divide-y divide-line/60">
              {dashboard.warehouses.map((warehouse) => (
                <li key={warehouse.id}>
                  <Link
                    href={"/warehouses/" + warehouse.id}
                    className="group flex min-h-20 items-center gap-4 rounded-lg px-2 py-4 transition hover:bg-surface"
                  >
                    <span className="shrink-0 text-muted transition group-hover:text-accent">
                      <AppIcon name="warehouse" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{warehouse.name}</p>
                      <p className="mt-1 text-xs text-muted">
                        {warehouse.code} · {warehouse.locationCount} aktiva
                        platser
                      </p>
                    </div>
                    <span aria-hidden="true" className="text-accent">
                      <MaterialArrow name="forward" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="py-3 sm:py-5">
            <div className="mb-5 flex items-start gap-4">
              <span className="mt-0.5 shrink-0 text-accent">
                <AppIcon name="warehouse" width={28} height={28} />
              </span>
              <div>
                <h2 id="warehouses-heading" className="mb-2! text-lg">
                  Inga aktiva lager ännu
                </h2>
                <p className="max-w-md text-sm leading-7 text-muted">
                  {admin
                    ? "Lägg till ett lager för att börja organisera sektioner och platser."
                    : "En administratör behöver lägga till ett lager innan det visas här."}
                </p>
              </div>
            </div>
            {admin && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                <Link className="button" href="/warehouses/new">
                  Lägg till lager{" "}
                  <span aria-hidden="true">
                    <MaterialArrow name="forward" />
                  </span>
                </Link>
                <Link
                  className="inline-flex min-h-13 items-center justify-center text-sm text-cyan sm:justify-start"
                  href="/warehouses"
                >
                  Hantera lager
                </Link>
              </div>
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
}
