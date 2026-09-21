import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/empty-state";
import { LocationForm } from "@/features/locations/location-form";
import { listWarehouses, getWarehouse } from "@/features/warehouses/service";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";

export default async function NewLocationPage({ searchParams }: { searchParams: Promise<{ warehouseId?: string }> }) {
  const context = await pageTenant();
  if (context.role !== "admin") notFound();
  const { warehouseId } = await searchParams;
  if (warehouseId) {
    const selected = await pageResource(() => getWarehouse(context, warehouseId));
    if (!selected.active) notFound();
  }
  const warehouses = (await listWarehouses(context)).filter(warehouse => warehouse.active);
  return <AppShell context={context}>
    <PageHeading eyebrow="Lagerstruktur" title="Skapa lagerplatser" description="Välj zon och hylla. Skapa en plats eller en följd med upp till 100 positioner." />
    {warehouses.length ? <LocationForm warehouses={warehouses} warehouseId={warehouseId} /> : <EmptyState title="Börja med ett lager" action={<Link className="button" href="/warehouses/new">Skapa lager</Link>}>Lagerplatser måste tillhöra ett aktivt lager.</EmptyState>}
  </AppShell>;
}
