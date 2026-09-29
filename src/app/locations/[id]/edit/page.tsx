import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { MaterialArrow } from "@/components/material-arrow";
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
      <Link
        href={"/locations/" + id}
        className="mb-4 inline-flex min-h-13 items-center gap-2 text-sm text-accent"
      >
        <MaterialArrow name="back" />
        Till lagerplatsen
      </Link>
      <PageHeading
        title="Redigera lagerplats"
        description={location.warehouseName + " · " + location.code}
      />
      <LocationForm warehouses={[]} initial={location} />
    </AppShell>
  );
}
