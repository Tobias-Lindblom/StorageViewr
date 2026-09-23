import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { WarehouseForm } from "@/features/warehouses/warehouse-form";
import { getWarehouse } from "@/features/warehouses/service";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";

export default async function EditWarehousePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await pageTenant();
  if (context.role !== "admin") notFound();
  const { id } = await params;
  const warehouse = await pageResource(() => getWarehouse(context, id));
  return (
    <AppShell context={context}>
      <PageHeading eyebrow="Lagerstruktur" title="Redigera lager" />
      <WarehouseForm initial={warehouse} />
    </AppShell>
  );
}
