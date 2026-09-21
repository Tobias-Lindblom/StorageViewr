import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/empty-state";
import { LocationList } from "@/features/locations/location-list";
import { listLocations } from "@/features/locations/service";
import { getWarehouse } from "@/features/warehouses/service";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";

export default async function LocationsPage({ searchParams }: { searchParams: Promise<{ warehouseId?: string }> }) {
  const context = await pageTenant();
  const { warehouseId } = await searchParams;
  const warehouse = warehouseId ? await pageResource(() => getWarehouse(context, warehouseId)) : undefined;
  const locations = await pageResource(() => listLocations(context, warehouseId));
  return <AppShell context={context}>
    <PageHeading eyebrow="Lagerstruktur" title="Lagerplatser" description={warehouse ? warehouse.name : "Hitta rätt zon, hylla och position."}
      action={context.role === "admin" ? <Link className="button" href={"/locations/new" + (warehouseId ? "?warehouseId=" + warehouseId : "")}>+ Skapa platser</Link> : undefined} />
    <div className="mb-5 flex flex-wrap gap-4">{warehouse && <Link className="inline-flex min-h-13 items-center text-sm text-cyan" href="/locations">Visa alla lager</Link>}
      {locations.some(location => location.active) && <Link className="button-secondary" href={"/locations/labels" + (warehouseId ? "?warehouseId=" + warehouseId : "")}>QR-etiketter ↗</Link>}</div>
    {locations.length ? <LocationList locations={locations} /> : <EmptyState title="Inga lagerplatser ännu">Skapa lagerplatser för att ge varje hylla och position en tydlig kod och en egen QR-etikett.</EmptyState>}
  </AppShell>;
}
