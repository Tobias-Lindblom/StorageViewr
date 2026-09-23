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
        title="Dina lager"
        description="Fysiska lager och deras lagerplatser."
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
        <div className="grid gap-4 sm:grid-cols-2">
          {warehouses.map((warehouse) => (
            <Link
              key={warehouse.id}
              href={"/warehouses/" + warehouse.id}
              className="panel p-5! transition hover:border-accent/60"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="rounded-xl bg-violet-500/10 p-3 text-accent">
                  <AppIcon name="warehouse" />
                </span>
                <span
                  className={
                    warehouse.active
                      ? "text-xs text-cyan"
                      : "text-xs text-muted"
                  }
                >
                  {warehouse.active ? "Aktivt" : "Inaktivt"}
                </span>
              </div>
              <h2 className="mb-2 wrap-break-word text-lg">{warehouse.name}</h2>
              <p className="mb-5 text-xs text-muted">{warehouse.code}</p>
              <div className="flex items-center justify-between border-t border-line pt-4 text-sm">
                <span>{warehouse.locationCount} aktiva platser</span>
                <span className="text-accent" aria-hidden="true">
                  <MaterialArrow name="forward" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
