import Link from "next/link";
import { PublicInfoPage } from "@/components/public-info-page";
import { pilotContact } from "@/lib/pilot-contact";
import { publicMetadata } from "@/lib/public-metadata";

export const metadata = publicMetadata("/kontakt", "Kontakta oss | StorageViewr",
  "Frågor om StorageViewr eller piloten? Kontakta Tobias Lindblom. Svar inom 24 timmar på pilotförfrågningar.");

export default function ContactPage() {
  return <PublicInfoPage title="Kontakta oss" intro={
    <>Har du frågor om StorageViewr, ert lager eller möjligheten att testa
      tjänsten? Hör av dig direkt till {pilotContact.name}.</>}>
    <section><h2>E-post</h2>
      <p><a href={"mailto:" + pilotContact.email}>{pilotContact.email}</a></p>
      <p>Pilotförfrågningar besvaras inom {pilotContact.responseHours} timmar.</p>
    </section>
    <section><h2>Ansök om pilot</h2>
      <p>Berätta om verksamheten och ert lager i <Link href="/pilot#pilot-form">pilotformuläret</Link>.
        Förfrågan är obindande. Pris, testperiod och villkor bestäms före start.</p>
    </section>
    <section><h2>Frågor om dina uppgifter?</h2>
      <p>Använd samma e-postadress för att begära tillgång till, rättelse eller
        radering av dina uppgifter. Läs <Link href="/integritet">hur vi hanterar personuppgifter vid en pilotförfrågan</Link>.
        Undvik känsliga personuppgifter i ditt meddelande.</p>
    </section>
  </PublicInfoPage>;
}
