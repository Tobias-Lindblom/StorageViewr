import Link from "next/link";
import { PublicInfoPage } from "@/components/public-info-page";
import { pilotContact } from "@/lib/pilot-contact";
import { publicMetadata } from "@/lib/public-metadata";

export const metadata = publicMetadata("/om-oss", "Om oss | StorageViewr",
  "StorageViewr utvecklas av Tobias Lindblom för fysisk lagerkontroll, lagerplatser och inventering med mobilen.");

export default function AboutPage() {
  return <PublicInfoPage title="Om StorageViewr" intro={
    <>StorageViewr hjälper mindre företag att koppla produkter till fysiska
      lagerplatser, inventera med mobilen och följa upp vad som senast
      verifierades.</>}>
    <section><h2>Vem står bakom?</h2>
      <p>StorageViewr drivs och utvecklas av {pilotContact.name}.
        Tjänsten är i en begränsad pilot. Det innebär att vi testar
        arbetsflödet i riktiga lager och tar in återkoppling inför fortsatt utveckling.</p>
    </section>
    <section><h2>Fokus på fysisk lagerkontroll</h2>
      <p>Lagerplatser, QR-etiketter, registrerade lagerhändelser och signerade
        inventeringsrapporter hör ihop i samma arbetsflöde. Lagerhälsa visar
        vilka registrerade positioner som bedöms som tillförlitliga och vilka
        som behöver kontrolleras.</p>
      <p>StorageViewr kompletterar företagets befintliga system.
        Piloten omfattar inte automatisk synkronisering med order- eller affärssystem.</p>
    </section>
    <section><h2>Vill du veta mer?</h2>
      <p><Link href="/kontakt">Kontakta oss</Link> med frågor eller
        läs <Link href="/pilot">om att testa StorageViewr i en pilot</Link>.</p>
    </section>
  </PublicInfoPage>;
}
