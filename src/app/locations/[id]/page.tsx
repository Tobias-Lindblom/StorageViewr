import { AppShell } from "@/components/app-shell";
import { LocationDetail } from "@/features/locations/location-detail";
import { getLocation } from "@/features/locations/service";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";

export default async function LocationPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await pageTenant();
  const { id } = await params;
  const location = await pageResource(() => getLocation(context, id));
  return <AppShell context={context}><LocationDetail location={location} admin={context.role === "admin"} /></AppShell>;
}
