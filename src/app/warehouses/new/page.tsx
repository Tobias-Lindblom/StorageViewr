import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { WarehouseForm } from "@/features/warehouses/warehouse-form";
import { pageTenant } from "@/lib/server/page-auth";

export default async function NewWarehousePage() {
  const context = await pageTenant();
  if (context.role !== "admin") notFound();
  return (
    <AppShell context={context}>
      <PageHeading
        eyebrow="Lagerstruktur"
        title="Nytt lager"
        description="Ett lager representerar en fysisk adress eller lagerbyggnad."
      />
      <WarehouseForm />
    </AppShell>
  );
}
