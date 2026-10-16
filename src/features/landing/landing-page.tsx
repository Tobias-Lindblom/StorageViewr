import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import { BrandLogo } from "@/components/brand-logo";
import { MaterialArrow } from "@/components/material-arrow";
import { registrationEnabled } from "@/features/auth/registration";
import styles from "./landing-page.module.css";

export const landingMetadata: Metadata = {
  title: "StorageViewr – se hur lagret faktiskt mår",
  description:
    "Få kontroll över lagersaldon, verifieringsgrad, avvikelser och lagervärde. Skanna QR-koder, inventera och skapa tydliga lagerrapporter.",
};

const overviewFacts = [
  "Aktuell lagerhälsa",
  "QR-baserat arbetsflöde",
  "Byggt för mobilen",
];

const supportingFeatures = [
  {
    title: "Mobil PWA",
    description:
      "Lägg StorageViewr på hemskärmen och öppna lagret som en app, direkt där arbetet sker.",
    icon: "dashboard",
  },
  {
    title: "Roller & behörigheter",
    description:
      "Administratörer hanterar strukturen medan lagerpersonal räknar och registrerar händelser.",
    icon: "user",
  },
  {
    title: "CSV-import",
    description:
      "Importera ett befintligt produktregister med förhandsgranskning och tydliga radfel före sparning.",
    icon: "download",
  },
  {
    title: "Flera lager",
    description:
      "Samla lager och lagerplatser i samma företag och behåll en tydlig fysisk struktur.",
    icon: "warehouse",
  },
] as const;

export default function LandingPage() {
  const registrationAvailable = registrationEnabled();
  const primaryHref = registrationAvailable ? "/register" : "/login";
  const primaryLabel = registrationAvailable ? "Skapa konto" : "Öppna appen";

  return (
    <main id="toppen" className={`viewport-page ${styles.page}`}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <BrandLogo />
          <nav aria-label="Huvudnavigation" className={styles.navigation}>
            <div className={styles.navigationLinks}>
              <a href="#oversikt">Översikt</a>
              <a href="#qr-skanner">QR-skanner</a>
              <a href="#lagerplatser">Lagerplatser</a>
              <a href="#lagerhandelser">Historik</a>
              <a href="#inventering">Inventering</a>
              <a href="#rapporter">Rapporter</a>
            </div>
            <Link
              className={`${styles.loginButton} button-secondary`}
              href="/login"
            >
              Logga in
            </Link>
          </nav>
        </div>
      </header>

      <section
        id="oversikt"
        aria-labelledby="overview-title"
        className={styles.hero}
      >
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <h1 id="overview-title">Se direkt hur lagret faktiskt mår</h1>
            <p className={styles.lead}>
              Få en tydlig överblick över saldon, verifieringsgrad, avvikelser
              och lagervärde — utan att behöva leta i flera system eller
              kalkylblad.
            </p>
            <p className={styles.bodyCopy}>
              StorageViewr visar vad som är aktuellt, vad som behöver
              kontrolleras och var du bör lägga fokus härnäst.
            </p>

            <div className={styles.actions}>
              <Link
                href={primaryHref}
                className={`${styles.primaryAction} button`}
              >
                {primaryLabel}
                <MaterialArrow name="forward" />
              </Link>
              <a
                href="#qr-skanner"
                className={`${styles.secondaryAction} button-secondary`}
              >
                Se funktionerna
                <MaterialArrow name="down" />
              </a>
            </div>

            <ul className={styles.facts} aria-label="Viktiga funktioner">
              {overviewFacts.map((fact) => (
                <li key={fact}>
                  <span aria-hidden="true" />
                  {fact}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.visualHalo} aria-hidden="true" />
            <Image
              className={styles.heroImage}
              src="/images/Hero.png"
              alt="StorageViewrs dashboard med lagerhälsa, avvikelser och dagens fokus"
              width={1086}
              height={1448}
              sizes="(max-width: 900px) 86vw, 48vw"
              priority
            />
          </div>
        </div>
      </section>

      <section
        id="qr-skanner"
        aria-labelledby="scanner-title"
        className={styles.featureSection}
      >
        <div className={styles.featureInner}>
          <div className={styles.featureCopy}>
            <h2 id="scanner-title">
              Från fysisk lagerplats till rätt information på sekunder
            </h2>
            <p>
              Märk upp hyllor och lagerplatser med QR-koder och öppna rätt plats
              direkt med mobilen.
            </p>
            <p>
              Skanna etiketten för att se innehåll, kontrollera saldo, inventera
              eller registrera en lagerhändelse — precis där arbetet sker.
            </p>
            <p className={styles.featureStatement}>
              Ingen handterminal. Ingen installation. Bara mobilen.
            </p>
          </div>

          <div className={`${styles.featureVisual} ${styles.scannerVisual}`}>
            <div className={styles.imageGlow} aria-hidden="true" />
            <Image
              className={styles.scannerImage}
              src="/images/Scanner.png"
              alt="Mobilvy som skannar QR-koden på lagerplats A-01-03"
              width={1024}
              height={1536}
              sizes="(max-width: 900px) 92vw, 46vw"
            />
          </div>
        </div>
      </section>

      <section
        id="lagerplatser"
        aria-labelledby="storage-title"
        className={styles.featureSection}
      >
        <div className={`${styles.featureInner} ${styles.storageFeature}`}>
          <div className={styles.featureCopy}>
            <h2 id="storage-title">Vet vad du har — och exakt var det finns</h2>
            <p>
              En produkt kan finnas på flera lagerplatser. StorageViewr visar
              både totalsaldot och hur lagret är fördelat på varje fysisk plats.
            </p>
            <p>
              Öppna en lagerplats för att se vad som ska finnas där, eller öppna
              en produkt för att se saldo, lagervärde, placeringar och senaste
              aktivitet.
            </p>
            <p className={styles.featureStatement}>
              Från enskild hylla till hela lagret — samma tydliga bild.
            </p>
          </div>

          <div className={`${styles.featureVisual} ${styles.storageVisual}`}>
            <div className={styles.imageGlow} aria-hidden="true" />
            <Image
              className={styles.storageImage}
              src="/images/Storage and product.png"
              alt="StorageViewr visar en lagerplats och en produkt med saldo, lagervärde och placeringar"
              width={1536}
              height={1024}
              sizes="(max-width: 900px) 94vw, 54vw"
            />
          </div>
        </div>
      </section>

      <section
        id="lagerhandelser"
        aria-labelledby="changes-title"
        className={styles.featureSection}
      >
        <div className={styles.featureInner}>
          <div className={styles.featureCopy}>
            <h2 id="changes-title">Varje lagerförändring går att följa</h2>
            <p>
              Registrera inleveranser, uttag och flyttar direkt när de sker.
              Saldot uppdateras på rätt produkt och lagerplats utan extra
              kalkylblad eller dubbelarbete.
            </p>
            <p>
              Varje händelse sparas med produkt, antal, lagerplats, tidpunkt och
              användare. Även inventeringar och saldokorrigeringar samlas i
              samma tydliga historik.
            </p>
            <p className={styles.featureStatement}>
              Alltid uppdaterat. Alltid möjligt att följa tillbaka.
            </p>
          </div>

          <div className={`${styles.featureVisual} ${styles.changesVisual}`}>
            <div className={styles.imageGlow} aria-hidden="true" />
            <Image
              className={styles.changesImage}
              src="/images/Changes and history.png"
              alt="StorageViewr visar registrering av en inleverans och historik över lagerhändelser"
              width={1536}
              height={1024}
              sizes="(max-width: 900px) 94vw, 54vw"
            />
          </div>
        </div>
      </section>

      <section
        id="inventering"
        aria-labelledby="inventory-title"
        className={styles.featureSection}
      >
        <div className={`${styles.featureInner} ${styles.inventoryFeature}`}>
          <div className={styles.featureCopy}>
            <h2 id="inventory-title">Inventera där varorna faktiskt finns</h2>
            <p>
              Skapa en inventering, välj vilka lagerplatser som ska räknas och
              arbeta dig genom lagret direkt från mobilen.
            </p>
            <p>StorageViewr håller automatiskt koll på:</p>
            <ul className={styles.inventoryList}>
              <li>vilka platser som är klara</li>
              <li>vilka som återstår</li>
              <li>hur långt inventeringen kommit</li>
              <li>vilka saldon som avviker</li>
            </ul>
            <p className={styles.featureStatement}>
              Lagret förändras inte förrän inventeringen slutförs, vilket gör
              processen trygg och kontrollerad.
            </p>
          </div>

          <div className={`${styles.featureVisual} ${styles.inventoryVisual}`}>
            <div className={styles.imageGlow} aria-hidden="true" />
            <Image
              className={styles.inventoryImage}
              src="/images/Inventory.png"
              alt="Pågående inventering i StorageViewr med framsteg och återstående lagerplatser"
              width={1086}
              height={1448}
              sizes="(max-width: 900px) 88vw, 44vw"
            />
          </div>
        </div>
      </section>

      <section
        id="rapporter"
        aria-labelledby="documents-title"
        className={styles.featureSection}
      >
        <div className={styles.featureInner}>
          <div className={styles.featureCopy}>
            <h2 id="documents-title">Från lagersaldo till färdiga rapporter</h2>
            <p>
              Skapa en lagervärdesrapport som sammanställer produkter, antal,
              styckvärden och totalt lagervärde. Företagets dokumentuppgifter
              följer med i den färdiga PDF-filen.
            </p>
            <p>
              När en inventering är slutförd kan du hämta en separat rapport med
              förväntat antal, räknat antal, avvikelser, räknare och tidpunkt.
            </p>
            <p className={styles.featureStatement}>
              Tydliga underlag — färdiga att spara, dela och följa upp.
            </p>
          </div>

          <div className={`${styles.featureVisual} ${styles.documentsVisual}`}>
            <div className={styles.imageGlow} aria-hidden="true" />
            <Image
              className={styles.documentsImage}
              src="/images/Documents.png"
              alt="StorageViewr visar lagervärdesrapport och inventeringsrapport med företagsuppgifter"
              width={1122}
              height={1402}
              sizes="(max-width: 900px) 88vw, 44vw"
            />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="supporting-features-title"
        className={styles.supportingSection}
      >
        <div className={styles.supportingInner}>
          <header className={styles.supportingHeader}>
            <h2 id="supporting-features-title">
              Allt runt omkring, redan på plats.
            </h2>
            <p>
              StorageViewr ger både administratörer och lagerpersonal ett enkelt
              sätt att komma igång, arbeta mobilt och hålla strukturen tydlig
              när verksamheten växer.
            </p>
          </header>

          <ul className={styles.capabilityGrid}>
            {supportingFeatures.map((feature) => (
              <li key={feature.title} className={styles.capabilityCard}>
                <span className={styles.capabilityIcon} aria-hidden="true">
                  <AppIcon name={feature.icon} width={23} height={23} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="cta-title" className={styles.ctaSection}>
        <div className={styles.ctaPanel}>
          <div>
            <p className={styles.sectionNumber}>
              Ett tydligare lager börjar här
            </p>
            <h2 id="cta-title">
              Få kontroll utan att göra arbetet krångligare.
            </h2>
          </div>
          <Link href={primaryHref} className={`${styles.primaryAction} button`}>
            {primaryLabel}
            <MaterialArrow name="forward" />
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <BrandLogo href="#toppen" />
              <p>
                Lagerkontroll för mindre företag — från fysisk hylla till
                färdigt underlag.
              </p>
            </div>

            <nav
              aria-label="Länkar i sidfoten"
              className={styles.footerNavigation}
            >
              <div className={styles.footerLinkGroup}>
                <h2>Produkt</h2>
                <a href="#oversikt">Översikt</a>
                <a href="#qr-skanner">QR-skanner</a>
                <a href="#lagerplatser">Lagerplatser</a>
              </div>
              <div className={styles.footerLinkGroup}>
                <h2>Arbetsflöde</h2>
                <a href="#lagerhandelser">Historik</a>
                <a href="#inventering">Inventering</a>
                <a href="#rapporter">Rapporter</a>
              </div>
              <div className={styles.footerLinkGroup}>
                <h2>Konto</h2>
                <Link href="/login">Logga in</Link>
                {registrationAvailable && (
                  <Link className={styles.footerAccentLink} href="/register">
                    Skapa konto
                    <MaterialArrow name="forward" size={16} />
                  </Link>
                )}
              </div>
            </nav>
          </div>

          <div className={styles.footerBottom}>
            <span>© {new Date().getFullYear()} StorageViewr</span>
            <a className={styles.footerTopLink} href="#toppen">
              Till toppen
              <AppIcon
                name="chevron"
                width={15}
                height={15}
                className={styles.footerTopIcon}
              />
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
