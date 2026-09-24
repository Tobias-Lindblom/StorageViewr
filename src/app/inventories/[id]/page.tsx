import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MaterialArrow } from "@/components/material-arrow";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";
import { getInventory } from "@/features/inventory/session-queries";
import { InventoryWorkspace } from "@/features/inventory/inventory-workspace";
export default async function InventoryPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ location?: string | string[] }>;
}) {
  const context = await pageTenant();
  const { id } = await params;
  const inventory = await pageResource(() => getInventory(context, id));
  const { location } = await searchParams;
  if (location && (typeof location !== "string" || !inventory.places.some(place => place.id === location))) notFound();
  return <AppShell context={context}>
    <Link href="/inventories" className="mb-4 inline-flex min-h-13 items-center gap-2 text-sm text-accent"><MaterialArrow name="back" />Alla inventeringar</Link>
    <InventoryWorkspace initial={inventory} admin={context.role === "admin"} initialLocationId={typeof location === "string" ? location : undefined} />
  </AppShell>;
}
