import { publicMetadata } from "@/lib/public-metadata";
import PilotPage from "@/features/pilot/pilot-page";

export const metadata = publicMetadata(
  "/pilot", "Starta pilot | StorageViewr",
  "Ansök om att testa StorageViewr i ert riktiga lager. Inventera, hantera lagerplatser, QR-koder, lagersaldo och rapporter direkt från mobilen.",
);

export default function Page() {
  return <PilotPage />;
}
