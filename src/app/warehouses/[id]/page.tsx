import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/empty-state";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";
import { getWarehouse } from "@/features/warehouses/service";
import { listLocations } from "@/features/locations/service";
import { LocationList } from "@/features/locations/location-list";
import { DownloadLocationReport } from "@/features/locations/download-location-report";
import { WarehouseEditorSheet } from "@/features/warehouses/warehouse-editor-sheet";
import { LocationEditorSheet } from "@/features/locations/location-editor-sheet";

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
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
              {warehouse.active && (
                <LocationEditorSheet
                  warehouses={[{ id: warehouse.id, name: warehouse.name }]}
                  warehouseId={warehouse.id}
                  label="+ Skapa platser"
                  className="button col-span-2 w-full whitespace-nowrap px-4! sm:w-auto sm:flex-none"
                />
              )}
              <WarehouseEditorSheet
                initial={warehouse}
                label="Redigera lager"
                className="button-secondary w-full whitespace-nowrap px-4! sm:w-auto sm:flex-none"
              />
              {locations.length > 0 && (
                <DownloadLocationReport warehouseId={id} />
              )}
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
