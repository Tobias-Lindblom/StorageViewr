import type { Metadata } from "next";
import PilotPage from "@/features/pilot/pilot-page";

export const metadata: Metadata = {
  title: "Starta pilot | StorageViewr",
  description:
    "Ansök om att testa StorageViewr i ert riktiga lager. Inventera, hantera lagerplatser, QR-koder, lagersaldo och rapporter direkt från mobilen.",
};

export default function Page() {
  return <PilotPage />;
}

