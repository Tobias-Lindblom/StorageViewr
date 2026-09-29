import { MaterialArrow } from "@/components/material-arrow";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/empty-state";
import { AppIcon } from "@/components/app-icon";
import { pageTenant } from "@/lib/server/page-auth";
import { listWarehouses } from "@/features/warehouses/service";

export default async function WarehousesPage() {
  const context = await pageTenant();
  const warehouses = await listWarehouses(context);
  const admin = context.role === "admin";
  return (
    <AppShell context={context}>
      <PageHeading
        title="Lager"
        description="Fysiska lager och tillhörande lagerplatser."
        action={
          admin ? (
            <Link className="button" href="/warehouses/new">
              + Lägg till lager
            </Link>
          ) : undefined
        }
      />
      {!warehouses.length ? (
        <EmptyState
          title="Här börjar ditt lager"
          action={
            admin ? (
              <Link className="button" href="/warehouses/new">
                Skapa lager
              </Link>
            ) : undefined
          }
        >
          Lägg till ett fysiskt lager för att kunna organisera zoner, sektioner
          och platser.{!admin && " Be en administratör om hjälp."}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          {warehouses.map((warehouse) => (
            <Link
              key={warehouse.id}
              href={"/warehouses/" + warehouse.id}
              className="group flex min-h-24 items-center gap-4 border-b border-line/60 px-5 py-4 transition last:border-0 hover:bg-surface-raised sm:px-6"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-accent ring-1 ring-inset ring-violet-400/15">
                <AppIcon name="warehouse" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block wrap-break-word font-semibold">
                  {warehouse.name}
                </strong>
                <span className="mt-1 block wrap-break-word text-xs leading-5 text-muted">
                  {warehouse.code}
                  <span aria-hidden="true"> · </span>
                  {warehouse.locationCount}{" "}
                  {warehouse.locationCount === 1
                    ? "aktiv plats"
                    : "aktiva platser"}
                </span>
              </span>
              <span
                className={
                  warehouse.active
                    ? "inline-flex shrink-0 items-center gap-2 text-xs text-cyan"
                    : "inline-flex shrink-0 items-center gap-2 text-xs text-muted"
                }
              >
                <span
                  className={
                    warehouse.active
                      ? "h-1.5 w-1.5 rounded-full bg-cyan"
                      : "h-1.5 w-1.5 rounded-full bg-muted"
                  }
                  aria-hidden="true"
                />
                <span className="sr-only sm:not-sr-only">
                  {warehouse.active ? "Aktivt" : "Inaktivt"}
                </span>
              </span>
              <MaterialArrow
                size={18}
                className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent"
              />
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
