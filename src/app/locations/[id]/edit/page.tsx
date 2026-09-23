import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { LocationForm } from "@/features/locations/location-form";
import { getLocation } from "@/features/locations/service";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await pageTenant();
  if (context.role !== "admin") notFound();
  const { id } = await params;
  const location = await pageResource(() => getLocation(context, id));
  if (!location.warehouseActive) notFound();
  return (
    <AppShell context={context}>
      <PageHeading
        eyebrow={location.warehouseName}
        title="Redigera lagerplats"
      />
      <LocationForm warehouses={[]} initial={location} />
    </AppShell>
  );
}
