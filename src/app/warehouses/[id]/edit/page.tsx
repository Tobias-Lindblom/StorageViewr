import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { MaterialArrow } from "@/components/material-arrow";
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
      <Link
        href={"/warehouses/" + id}
        className="mb-4 inline-flex min-h-13 items-center gap-2 text-sm text-accent"
      >
        <MaterialArrow name="back" />
        Till lagret
      </Link>
      <PageHeading
        title="Redigera lager"
        description={warehouse.name + " · " + warehouse.code}
      />
      <WarehouseForm initial={warehouse} />
    </AppShell>
  );
}
