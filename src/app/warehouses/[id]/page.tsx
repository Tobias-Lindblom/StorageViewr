import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/empty-state";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";
import { getWarehouse } from "@/features/warehouses/service";
import { listLocations } from "@/features/locations/service";
import { LocationList } from "@/features/locations/location-list";

export default async function WarehousePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await pageTenant();
  const { id } = await params;
  const warehouse = await pageResource(() => getWarehouse(context, id));
  const locations = await listLocations(context, id);
  const admin = context.role === "admin";
  return <AppShell context={context}>
    <PageHeading eyebrow={warehouse.code + (warehouse.active ? " · Aktivt lager" : " · Inaktivt lager")} title={warehouse.name}
      description={warehouse.address || "Ingen adress angiven."}
      action={admin ? <Link className="button-secondary" href={"/warehouses/" + id + "/edit"}>Redigera lager</Link> : undefined} />
    <div className="mb-7 flex flex-wrap gap-3">
      {admin && warehouse.active && <Link className="button" href={"/locations/new?warehouseId=" + id}>+ Skapa lagerplatser</Link>}
      {warehouse.active && locations.some(location => location.active) && <Link className="button-secondary" href={"/locations/labels?warehouseId=" + id}>Skriv ut QR-etiketter</Link>}
    </div>
    <h2>Lagerplatser <span className="text-muted">({locations.length})</span></h2>
    {locations.length ? <LocationList locations={locations} /> : <EmptyState title="Ge varje plats en kod">Lägg till platser som A-01-01. Du kan skapa en hel hylla med lagerplatser samtidigt.</EmptyState>}
  </AppShell>;
}
