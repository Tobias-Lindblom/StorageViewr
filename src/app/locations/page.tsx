import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { LocationList } from "@/features/locations/location-list";
import { listLocations } from "@/features/locations/service";
import { getWarehouse, listWarehouses } from "@/features/warehouses/service";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";

export default async function LocationsPage({ searchParams }: { searchParams: Promise<{ warehouseId?: string }> }) {
  const context = await pageTenant();
  const { warehouseId } = await searchParams;
  if (warehouseId) await pageResource(() => getWarehouse(context, warehouseId));
  const [locations, warehouses] = await Promise.all([
    pageResource(() => listLocations(context, warehouseId)),
    listWarehouses(context),
  ]);
  const scope = warehouseId ? "?warehouseId=" + warehouseId : "";

  return (
    <AppShell context={context}>
      <PageHeading
        title="Lagerplatser"
        action={
          <div className="flex flex-wrap gap-2">
            {context.role === "admin" && (
              <Link className="button flex-1 whitespace-nowrap px-4! sm:flex-none" href={"/locations/new" + scope}>
                + Skapa platser
              </Link>
            )}
            {locations.some(location => location.active) && (
              <Link className="button-secondary flex-1 whitespace-nowrap px-4! sm:flex-none" href={"/locations/labels" + scope}>
                QR-etiketter
              </Link>
            )}
          </div>
        }
      />
      <LocationList
        locations={locations}
        warehouses={warehouses.map(({ id, name, active }) => ({ id, name, active }))}
        warehouseId={warehouseId}
        admin={context.role === "admin"}
      />
    </AppShell>
  );
}
