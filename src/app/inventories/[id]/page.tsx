import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MaterialArrow } from "@/components/material-arrow";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";
import { getLocationByToken } from "@/features/locations/service";
import { getInventory } from "@/features/inventory/session-queries";
import { InventoryWorkspace } from "@/features/inventory/inventory-workspace";
export default async function InventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    location?: string | string[];
    qr?: string | string[];
  }>;
}) {
  const context = await pageTenant();
  const { id } = await params;
  const inventory = await pageResource(() => getInventory(context, id));
  const { location, qr } = await searchParams;
  if (
    location &&
    (typeof location !== "string" ||
      !inventory.places.some((place) => place.id === location))
  )
    notFound();
  let initialLocationVerified = false;
  if (qr !== undefined) {
    if (typeof qr !== "string" || typeof location !== "string") notFound();
    const scanned = await pageResource(() => getLocationByToken(context, qr));
    if (
      scanned.id !== location ||
      scanned.warehouseId !== inventory.warehouseId
    )
      notFound();
    initialLocationVerified = true;
  }
  return (
    <AppShell context={context}>
      <Link
        href={inventory.status === "completed" ? "/inventories/completed" : "/inventories"}
        className="mb-4 inline-flex min-h-13 items-center gap-2 text-sm text-accent"
      >
        <MaterialArrow name="back" />
        {inventory.status === "completed" ? "Genomförda inventeringar" : "Pågående inventeringar"}
      </Link>
      <InventoryWorkspace
        initial={inventory}
        admin={context.role === "admin"}
        initialLocationId={typeof location === "string" ? location : undefined}
        initialLocationVerified={initialLocationVerified}
      />
    </AppShell>
  );
}
