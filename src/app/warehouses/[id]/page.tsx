import { redirect } from "next/navigation";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";
import { getWarehouse } from "@/features/warehouses/service";

export default async function WarehousePage({ params }: {
  params: Promise<{ id: string }>;
}) {
  const context = await pageTenant();
  const { id } = await params;
  const warehouse = await pageResource(() => getWarehouse(context, id));
  redirect("/locations?" + new URLSearchParams({ warehouseId: warehouse.id }));
}
