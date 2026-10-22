import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { PageHeading } from "@/components/page-heading";
import { DiscrepancyList } from "@/features/inventory/discrepancy-list";
import { listDiscrepancies } from "@/features/inventory/discrepancies";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";

export default async function DiscrepanciesPage() {
  const context = await pageTenant();
  if (context.role !== "admin") notFound();
  const items = await pageResource(() => listDiscrepancies(context));
  return <AppShell context={context}>
    <PageHeading title="Öppna avvikelser" description="Granska skillnader mellan registrerat och fysiskt räknat saldo." />
    {items.length ? <DiscrepancyList items={items} /> : <EmptyState icon="verified" title="Inga öppna avvikelser">
      Lagrets räknade saldon stämmer med de registrerade saldona.
    </EmptyState>}
    <p className="mt-6 text-sm text-muted"><Link href="/inventories" className="text-accent">Öppna inventeringar</Link></p>
  </AppShell>;
}
