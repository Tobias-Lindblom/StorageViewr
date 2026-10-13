import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { pageTenant } from "@/lib/server/page-auth";
import { LocationScanner } from "@/features/scanner/location-scanner";

export default async function ScannerPage() {
  const context = await pageTenant();
  return <AppShell context={context}>
    <PageHeading title="Skanna lagerplats" description="Öppna platsen direkt med dess QR-etikett." />
    <div className="max-w-xl"><LocationScanner /></div>
  </AppShell>;
}
