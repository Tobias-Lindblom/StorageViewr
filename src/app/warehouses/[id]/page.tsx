import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/empty-state";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";
import { getWarehouse } from "@/features/warehouses/service";
import { listLocations } from "@/features/locations/service";
import { LocationList } from "@/features/locations/location-list";

export default async function WarehousePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await pageTenant();
  const { id } = await params;
  const warehouse = await pageResource(() => getWarehouse(context, id));
  const locations = await listLocations(context, id);
  const admin = context.role === "admin";

  return (
    <AppShell context={context}>
      <PageHeading
        title={warehouse.name}
        description={
          warehouse.code + (warehouse.address ? " · " + warehouse.address : "")
        }
        action={
          admin ? (
            <div className="flex gap-2">
              {warehouse.active && (
                <Link
                  className="button flex-1 whitespace-nowrap px-4! sm:flex-none"
                  href={"/locations/new?warehouseId=" + id}
                >
                  + Skapa platser
                </Link>
              )}
              <Link
                className="button-secondary flex-1 whitespace-nowrap px-4! sm:flex-none"
                href={"/warehouses/" + id + "/edit"}
              >
                Redigera lager
              </Link>
            </div>
          ) : undefined
        }
      />
      <div className="mb-4 flex items-center gap-3">
        <h2 className="mb-0! text-xl!">Lagerplatser</h2>
        <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs tabular-nums text-muted">
          {locations.length}
        </span>
      </div>
      {locations.length ? (
        <LocationList
          locations={locations}
          admin={admin}
          totalShownInHeading
        />
      ) : (
        <EmptyState title="Ge varje plats en kod">
          Lägg till platser som A-01-01. Du kan skapa en hel sektion med
          lagerplatser samtidigt.
        </EmptyState>
      )}
    </AppShell>
  );
}
