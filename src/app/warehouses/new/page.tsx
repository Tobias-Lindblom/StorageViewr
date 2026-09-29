import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { MaterialArrow } from "@/components/material-arrow";
import { PageHeading } from "@/components/page-heading";
import { WarehouseForm } from "@/features/warehouses/warehouse-form";
import { pageTenant } from "@/lib/server/page-auth";

export default async function NewWarehousePage() {
  const context = await pageTenant();
  if (context.role !== "admin") notFound();
  return (
    <AppShell context={context}>
      <Link
        href="/warehouses"
        className="mb-4 inline-flex min-h-13 items-center gap-2 text-sm text-accent"
      >
        <MaterialArrow name="back" />
        Alla lager
      </Link>
      <PageHeading
        title="Nytt lager"
        description="Lägg till en fysisk lageradress eller lagerbyggnad."
      />
      <WarehouseForm />
    </AppShell>
  );
}
