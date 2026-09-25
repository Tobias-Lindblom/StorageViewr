import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { MaterialArrow } from "@/components/material-arrow";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";
import { listInventories } from "@/features/inventory/session-queries";
import { InventoryList } from "@/features/inventory/inventory-list";

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
      <Link
        href="/inventories"
        className="mb-4 inline-flex min-h-13 items-center gap-2 text-sm text-accent"
      >
        <MaterialArrow name="back" />
        Pågående inventeringar
      </Link>
      <PageHeading
        title="Genomförda inventeringar"
        description="Tidigare räkningar och PDF-rapporter, samlade på ett ställe."
      />
      <InventoryList result={result} completed />
    </AppShell>
  );
}
