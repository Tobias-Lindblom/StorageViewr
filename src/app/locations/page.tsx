import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AppIcon } from "@/components/app-icon";
import { LocationOverview } from "@/features/locations/location-overview";
import { listLocations } from "@/features/locations/service";
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
  const selectedWarehouse = warehouseId ? await pageResource(() => getWarehouse(context, warehouseId)) : null;
  const [locations, warehouses] = await Promise.all([
    pageResource(() => listLocations(context, warehouseId)), listWarehouses(context),
  ]);
  const scope = warehouseId ? "?" + new URLSearchParams({ warehouseId }) : "";
  const activeWarehouses = warehouses.filter(warehouse => warehouse.active &&
    (!warehouseId || warehouse.id === warehouseId)).map(({ id, name }) => ({ id, name }));
  return <AppShell context={context}>
    <LocationOverview locations={locations} warehouses={warehouses.map(({ id, name, active }) => ({ id, name, active }))}
      warehouseId={warehouseId} admin={context.role === "admin"}
      createAction={context.role === "admin" ? activeWarehouses.length ? (
        <LocationEditorSheet key="create-location" warehouses={activeWarehouses} warehouseId={warehouseId}
          label="+ Ny lagerplats" className="location-create" initialCount={1} />
      ) : !selectedWarehouse ? <WarehouseEditorSheet key="create-warehouse" label="+ Nytt lager" className="location-create" /> : undefined : undefined}
      toolbarAction={locations.some(location => location.active) ?
        <Link key="labels" className="location-toolbar-action" href={"/locations/labels" + scope}>
          <AppIcon name="qr" width={18} height={18} />QR-etiketter
        </Link> : undefined} />
  </AppShell>;
}
