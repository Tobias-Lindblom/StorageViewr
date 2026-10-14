import { AppShell } from "@/components/app-shell";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";
import { listInventories } from "@/features/inventory/session-queries";
import { InventoryOverview } from "@/features/inventory/inventory-overview";

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
      <InventoryOverview result={result} completed />
    </AppShell>
  );
}
