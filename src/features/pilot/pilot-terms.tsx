import Link from "next/link";
import { pilotContact } from "@/lib/pilot-contact";
import styles from "./pilot-page.module.css";

export function PilotTerms() {
  return (
    <details className={styles.pilotTerms} id="pilotvillkor">
      <summary>Praktiskt om piloten</summary>
      <dl>
        <div><dt>Kontakt och svar</dt><dd>
          {pilotContact.name} återkommer inom {pilotContact.responseHours} timmar.
          Du når honom på <a href={"mailto:" + pilotContact.email}>{pilotContact.email}</a>.
        </dd></div>
        <div><dt>Pris och testperiod</dt><dd>
          Pris och pilotens längd är ännu inte fastställda.
          Du får ett förslag att ta ställning till före start.
          Förfrågan är inte en beställning.
        </dd></div>
        <div><dt>Uppstart och omfattning</dt><dd>
          Vi går tillsammans igenom lagerplatser, produktimport och den första
          inventeringen. Ni märker platserna och räknar varorna fysiskt.
          Ingen automatisk synkronisering med order- eller affärssystem ingår.
        </dd></div>
        <div><dt>Data och åtkomst efter piloten</dt><dd>
          Villkor för fortsatt åtkomst, utlämning och radering av lagerdata
          behöver bestämmas före pilotstart. Appen har PDF-export av
          lagervärdes- och inventeringsrapporter.
        </dd></div>
        <div><dt>Din förfrågan</dt><dd>
          Kontaktuppgifterna används för att hantera förfrågan.
          Läs <Link href="/integritet">om personuppgifter och lagringstid</Link>.
        </dd></div>
      </dl>
    </details>
  );
}
