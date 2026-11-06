import Link from "next/link";
import { PublicInfoPage } from "@/components/public-info-page";
import { pilotContact } from "@/lib/pilot-contact";
import { publicMetadata } from "@/lib/public-metadata";
import styles from "@/components/public-info-page.module.css";

export const metadata = publicMetadata(
  "/integritet", "Personuppgifter vid pilotförfrågan | StorageViewr",
  "Vem som ansvarar för din pilotförfrågan, vilka uppgifter som används och hur du kontaktar oss.",
);

export default function PrivacyPage() {
  return (
    <PublicInfoPage title="Personuppgifter vid pilotförfrågan" intro={
      <>Informationen gäller kontaktuppgifter från pilotformuläret, inte
        lagerdata eller användarkonton i en startad pilot. Uppdaterad 6 november 2026.</>}>
        <section><h2>Vem ansvarar?</h2>
          <p>StorageViewr drivs av {pilotContact.name}, som är personuppgiftsansvarig
            för pilotförfrågningar. Kontakt: <a href={"mailto:" + pilotContact.email}>{pilotContact.email}</a>.</p>
        </section>
        <section><h2>Vilka uppgifter används och varför?</h2>
          <p>Vi använder ditt namn, företagsnamn, e-postadress och uppgifter om
            verksamhetens typ, antal produkter och lagerplatser för att bedöma
            pilotens lämplighet och kontakta dig. Telefonnummer, nuvarande
            lagersystem, behov och fritext är frivilliga. Undvik känsliga
            personuppgifter i fritexten.</p>
          <p>Den rättsliga grunden är berättigat intresse: att besvara en förfrågan
            du själv skickat och följa upp möjligheten att testa tjänsten.
            Uppgifterna används inte för automatiska marknadsföringsutskick
            eller automatiserade beslut.</p>
          <p>För att motverka missbruk används tidsbegränsade, hashade räknare
            baserade på IP-adress och e-postadress. De löper ut inom ett dygn.</p>
        </section>
        <section><h2>Hur länge sparas förfrågan?</h2>
          <p>Förfrågan sparas i 90 dagar efter senaste kontakt. Om vi inte haft
            någon kontakt räknas tiden från inskicket. Detta gäller förfrågan;
            hanteringen av konton och lagerdata bestäms separat före pilotstart.</p>
        </section>
        <section><h2>Vem kan ta del av uppgifterna?</h2>
          <p>{pilotContact.name} hanterar förfrågningarna. Tekniska leverantörer
            för webbdrift, databas och eventuell felövervakning kan behandla
            uppgifter för att tjänsten ska fungera. Vid svar via e-post hanteras
            korrespondensen också av e-postleverantören.</p>
          <p className={styles.pending}>Förteckningen över leverantörer,
            lagringsregioner, eventuell behandling utanför EU/EES och
            säkerhetskopiors lagringstid håller på att kompletteras.
            Kontakta Tobias om du behöver dessa uppgifter innan du skickar en förfrågan.</p>
        </section>
        <section><h2>Dina rättigheter</h2>
          <p>Du kan begära tillgång till eller rättelse av dina uppgifter,
            invända mot behandlingen och begära radering eller begränsning.
            Vi prövar begäran enligt tillämpliga dataskyddsregler.
            Skriv till <a href={"mailto:" + pilotContact.email}>{pilotContact.email}</a>.
            Du kan också lämna klagomål till <a href="https://www.imy.se/privatperson/utfora-arenden/lamna-ett-klagomal/">Integritetsskyddsmyndigheten (IMY)</a>.</p>
        </section>
        <Link href="/pilot#pilot-form">Tillbaka till formuläret</Link>
    </PublicInfoPage>
  );
}
