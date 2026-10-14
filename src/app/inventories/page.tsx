import { AppShell } from "@/components/app-shell";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";
import { listInventories } from "@/features/inventory/session-queries";
import { InventoryOverview } from "@/features/inventory/inventory-overview";
import { StartInventory } from "@/features/inventory/start-inventory";
import { listWarehouses } from "@/features/warehouses/service";
import { listLocations } from "@/features/locations/service";

export default async function InventoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const context = await pageTenant();
  const admin = context.role === "admin";
  const query = await searchParams;
  const [result, warehouses, locations] = await Promise.all([
    pageResource(() => listInventories(context, query.page ?? 1, "active")),
    admin
      ? listWarehouses({ ...context, role: "warehouse" })
      : Promise.resolve([]),
    admin
      ? listLocations({ ...context, role: "warehouse" })
      : Promise.resolve([]),
  ]);
  return (
    <AppShell context={context}>
      <InventoryOverview result={result} admin={admin}
        action={admin ? <StartInventory warehouses={warehouses} locations={locations}
          className="product-create inventory-create" label={<><span aria-hidden="true">+</span> Starta inventering</>} /> : undefined} />
    </AppShell>
  );
}
