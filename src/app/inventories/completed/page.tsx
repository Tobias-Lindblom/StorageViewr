import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";
import { listInventories } from "@/features/inventory/session-queries";
import { InventoryList } from "@/features/inventory/inventory-list";
import { InventoryTabs } from "@/features/inventory/inventory-tabs";

export default async function CompletedInventoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const context = await pageTenant();
  const query = await searchParams;
  const result = await pageResource(() =>
    listInventories(context, query.page ?? 1, "completed"),
  );
  return (
    <AppShell context={context}>
      <PageHeading
        title="Inventering"
        description="Avslutade inventeringar med räkningar och PDF-rapporter."
      />
      <InventoryTabs active="completed" />
      <InventoryList result={result} completed />
    </AppShell>
  );
}
