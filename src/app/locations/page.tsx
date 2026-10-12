import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { LocationList } from "@/features/locations/location-list";
import { listLocations } from "@/features/locations/service";
import { DownloadLocationReport } from "@/features/locations/download-location-report";
import { getWarehouse, listWarehouses } from "@/features/warehouses/service";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";
import { LocationEditorSheet } from "@/features/locations/location-editor-sheet";
import { WarehouseEditorSheet } from "@/features/warehouses/warehouse-editor-sheet";

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ warehouseId?: string }>;
}) {
  const context = await pageTenant();
  const { warehouseId } = await searchParams;
  if (warehouseId) await pageResource(() => getWarehouse(context, warehouseId));
  const [locations, warehouses] = await Promise.all([
    pageResource(() => listLocations(context, warehouseId)),
    listWarehouses(context),
  ]);
  const scope = warehouseId ? "?warehouseId=" + warehouseId : "";
  const activeWarehouses = warehouses
    .filter((warehouse) => warehouse.active)
    .map(({ id, name }) => ({ id, name }));

  return (
    <AppShell context={context}>
      <PageHeading
        title="Lagerplatser"
        action={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            {context.role === "admin" && (
              activeWarehouses.length ? (
                <LocationEditorSheet
                  warehouses={activeWarehouses}
                  warehouseId={
                    activeWarehouses.some(
                      (warehouse) => warehouse.id === warehouseId,
                    )
                      ? warehouseId
                      : undefined
                  }
                  label="+ Skapa platser"
                  className="button col-span-2 w-full whitespace-nowrap px-4! sm:w-auto sm:flex-none"
                />
              ) : (
                <WarehouseEditorSheet
                  label="+ Skapa lager"
                  className="button col-span-2 w-full whitespace-nowrap px-4! sm:w-auto sm:flex-none"
                />
              )
            )}
            {locations.some((location) => location.active) && (
              <Link
                className="button-secondary w-full whitespace-nowrap px-4! sm:w-auto sm:flex-none"
                href={"/locations/labels" + scope}
              >
                QR-etiketter
              </Link>
            )}
            {locations.length > 0 && (
              <DownloadLocationReport warehouseId={warehouseId} />
            )}
          </div>
        }
      />
      <LocationList
        locations={locations}
        warehouses={warehouses.map(({ id, name, active }) => ({
          id,
          name,
          active,
        }))}
        warehouseId={warehouseId}
        admin={context.role === "admin"}
      />
    </AppShell>
  );
}
