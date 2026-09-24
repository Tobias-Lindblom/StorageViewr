import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { MaterialArrow } from "@/components/material-arrow";
import { LocationDetail } from "@/features/locations/location-detail";
import { getLocationByToken } from "@/features/locations/service";
import { inventoriesForLocation } from "@/features/scanner/service";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";
import { qrTokenSchema } from "@/validation/location";

export default async function ScannedLocationPage({ params }: { params: Promise<{ qrToken: string }> }) {
  const { qrToken } = await params;
  if (!qrTokenSchema.safeParse(qrToken).success) notFound();
  const context = await pageTenant("/location/" + qrToken);
  const location = await pageResource(() => getLocationByToken(context, qrToken));
  const inventories = await inventoriesForLocation(context, location.id);
  const destination = (id: string) => "/inventories/" + id + "?location=" + location.id + "&qr=" + qrToken;
  if (inventories.length === 1) redirect(destination(inventories[0].id));
  return <AppShell context={context}>
    {inventories.length ? <>
      <PageHeading title={"Inventera " + location.code} description="Platsen ingår i flera pågående inventeringar. Välj vilken du arbetar med." />
      <div className="space-y-3">{inventories.map(inventory => <Link key={inventory.id} href={destination(inventory.id)} className="panel flex items-center justify-between gap-4">
        <span className="min-w-0 break-words font-semibold">{inventory.name}</span><MaterialArrow className="text-accent" />
      </Link>)}</div>
      <Link href={"/locations/" + location.id} className="mt-4 inline-flex min-h-13 items-center gap-2 text-sm text-cyan">Visa platsuppgifter<MaterialArrow /></Link>
    </> : <LocationDetail location={location} admin={context.role === "admin"} context={context} />}
  </AppShell>;
}
