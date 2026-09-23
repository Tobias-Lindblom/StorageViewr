import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LocationDetail } from "@/features/locations/location-detail";
import { getLocationByToken } from "@/features/locations/service";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";
import { qrTokenSchema } from "@/validation/location";

export default async function ScannedLocationPage({
  params,
}: {
  params: Promise<{ qrToken: string }>;
}) {
  const { qrToken } = await params;
  if (!qrTokenSchema.safeParse(qrToken).success) notFound();
  const context = await pageTenant("/location/" + qrToken);
  const location = await pageResource(() =>
    getLocationByToken(context, qrToken),
  );
  return (
    <AppShell context={context}>
      <LocationDetail location={location} admin={context.role === "admin"} />
    </AppShell>
  );
}
