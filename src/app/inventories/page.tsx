import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";
import { listInventories } from "@/features/inventory/session-queries";
import { InventoryList } from "@/features/inventory/inventory-list";
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
      <PageHeading
        title="Inventering"
        description="Dina pågående inventeringar. Välj en för att fortsätta räkna."
        action={
          <div className="flex items-center gap-2">
            {admin && (
              <StartInventory warehouses={warehouses} locations={locations} />
            )}
            <Link
              href="/inventories/completed"
              className="button-secondary px-3! sm:px-5!"
              aria-label="Visa genomförda inventeringar"
            >
              Genomförda
            </Link>
          </div>
        }
      />
      <InventoryList result={result} admin={admin} />
    </AppShell>
  );
}
