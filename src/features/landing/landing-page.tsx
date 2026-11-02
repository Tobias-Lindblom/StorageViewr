import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import { BrandLogo } from "@/components/brand-logo";
import { MaterialArrow } from "@/components/material-arrow";
import { LandingHeader } from "./landing-header";
import { FloatingScrollToTop, FooterScrollToTop } from "./scroll-to-top";
import styles from "./landing-page.module.css";

export const landingMetadata: Metadata = {
  title: "StorageViewr – lagerkontroll och inventering med QR",
  description:
    "Få kontroll över fysiska lagerplatser, verifierade saldon och lagervärde. Inventera med QR, hantera avvikelser och skapa signerade PDF-rapporter.",
};

const overviewFacts = [
  "Personlig pilotstart",
  "Ingen installation",
  "Mobil och dator",
];

const audienceTypes = [
  "E-handel",
  "Grossist",
  "Verkstad",
  "Reservdelar",
  "Produktion",
  "Förråd",
];

const audienceProofs = [
  { label: "Verifierade saldon", icon: "verified" },
  { label: "QR-baserade lagerplatser", icon: "qr" },
  { label: "Inventering med mobil", icon: "inventory" },
] as const;

const onboardingSteps = [
  {
    title: "Skapa lager",
    description: "Lägg upp den fysiska lagerenheten.",
  },
  {
    title: "Skapa lagerplatser",
    description: "Definiera hyllor och positioner.",
  },
  {
    title: "Lägg till produkter",
    description: "Skapa manuellt eller importera via CSV.",
  },
  {
    title: "Placera produkterna",
    description: "Koppla varje produkt till rätt plats.",
  },
  {
    title: "Genomför första inventeringen",
    description: "Räkna, granska och signera.",
  },
] as const;

const healthSignals = [
  { label: "Verifierade positioner", value: 37, icon: "verified" },
  { label: "Öppna avvikelser", value: 2, icon: "alert" },
  { label: "Gammal kontroll", value: 1, icon: "history" },
] as const;

const supportingFeatures = [
  {
    title: "Mobil PWA",
    description: "Arbeta i webbläsaren eller lägg appen på hemskärmen.",
    icon: "dashboard",
  },
  {
    title: "Roller & behörigheter",
    description: "Bjud in medarbetare och styr åtkomst med tydliga roller.",
    icon: "user",
  },
  {
    title: "CSV-import",
    description: "Importera produktregister med förhandsgranskning och tydliga radfel.",
    icon: "download",
  },
  {
    title: "Flera lager",
    description: "Håll lagerplatser, inventeringar och rapporter åtskilda per lager.",
    icon: "warehouse",
  },
] as const;

export default function LandingPage() {
  const primaryHref = "/pilot";
  const primaryLabel = "Ansök om pilot";

  return (
    <main id="toppen" className={`viewport-page ${styles.page}`}>
      <LandingHeader />
      <FloatingScrollToTop />

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
              Få en samlad överblick över lagerhälsa, registrerade saldon,
              avvikelser och lagervärde — utan att behöva leta i flera system
              eller kalkylblad.
            </p>
            <p className={styles.bodyCopy}>
              Se vilka fysiska lagerpositioner som är verifierade, vad som
              behöver uppmärksamhet och var nästa inventering gör störst
              skillnad.
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
                href="#kom-igang"
                className={`${styles.secondaryAction} button-secondary`}
              >
                Se hur det fungerar
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
              src="/images/Hero-image.png"
              alt="StorageViewrs översikt med lagerhälsa, dagens fokus, snabbåtgärder och lagervärde"
              width={1086}
              height={1448}
              sizes="(max-width: 900px) 86vw, 48vw"
              priority
            />
          </div>
        </div>
      </section>

      <section
        id="lagerhalsa"
        aria-labelledby="health-title"
        className={styles.healthSection}
      >
        <div className={styles.healthInner}>
          <div className={styles.healthPanel}>
            <div className={styles.healthCopy}>
              <h2 id="health-title">
                Se vilka lagerpositioner du faktiskt kan lita på.
              </h2>
              <div
                className={styles.healthScore}
                aria-label="Exempel på lagerhälsa: 92 procent"
              >
                <strong>
                  92<span>%</span>
                </strong>
                <span>Lagerhälsa</span>
              </div>
              <p className={styles.healthVerified}>
                37 av 40 lagerpositioner verifierade
              </p>
              <div
                className={styles.healthProgress}
                role="progressbar"
                aria-label="Verifierad lagerhälsa"
                aria-valuenow={92}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span aria-hidden="true" />
              </div>
            </div>
            <div className={styles.healthSummary}>
              <header className={styles.healthSummaryHeader}>
                <h3>Lagerhälsa</h3>
                <p>
                  StorageViewr använder fysisk inventering och lagerhistorik
                  för att visa hur aktuell och tillförlitlig lagerinformationen
                  är.
                </p>
              </header>
              <dl className={styles.healthRows}>
                {healthSignals.map((signal) => (
                  <div key={signal.label}>
                    <dt>
                      <span className={styles.healthRowIcon} aria-hidden="true">
                        <AppIcon name={signal.icon} width={18} height={18} />
                      </span>
                      {signal.label}
                    </dt>
                    <dd>{signal.value}</dd>
                  </div>
                ))}
              </dl>
              <div className={styles.healthAttention}>
                <strong>3 positioner behöver uppmärksamhet</strong>
                <p>
                  När något gör saldot osäkert ser du direkt var du behöver
                  kontrollera.
                </p>
              </div>
            </div>
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
              Skanna lagerplatsen och fortsätt där arbetet sker
            </h2>
            <p>
              Skapa utskrivbara QR-etiketter för aktiva lagerplatser. En
              skanning öppnar rätt plats eller fortsätter en pågående
              inventering direkt i mobilen.
            </p>
            <p>
              På lagerplatsen ser du registrerade produkter och saldon och kan
              inventera, registrera en inleverans, flytta material eller
              korrigera ett saldo. Platskoden kan också anges manuellt.
            </p>
            <p className={styles.featureStatement}>
              Samma skanner fungerar i webbläsaren och den installerade PWA:n.
            </p>
          </div>

          <div className={`${styles.featureVisual} ${styles.scannerVisual}`}>
            <div className={styles.imageGlow} aria-hidden="true" />
            <Image
              className={styles.scannerImage}
              src="/images/Scanner-image.png"
              alt="StorageViewrs QR-skanner har identifierat lagerplats A-01-03"
              width={1086}
              height={1448}
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
              både det registrerade totalantalet och hur det är fördelat på
              varje fysisk plats.
            </p>
            <p>
              Öppna en lagerplats för att se vad som ska finnas där, eller öppna
              en produkt för att se registrerat saldo, styckvärde, totalt värde
              och fördelningen mellan placeringarna.
            </p>
            <p>
              Inleveranser, flyttar, inventeringar och korrigeringar sparas i
              historiken med tidpunkt och användare.
            </p>
            <p className={styles.featureStatement}>
              Från enskild hylla till hela lagret — samma tydliga bild.
            </p>
          </div>

          <div className={`${styles.featureVisual} ${styles.storageVisual}`}>
            <div className={styles.imageGlow} aria-hidden="true" />
            <Image
              className={styles.storageImage}
              src="/images/Product-image.png"
              alt="En produkt i StorageViewr med styckvärde, totalt värde och saldo för varje lagerplats"
              width={1086}
              height={1448}
              sizes="(max-width: 900px) 88vw, 44vw"
            />
          </div>
        </div>
      </section>

      <section
        id="inventering"
        aria-labelledby="inventory-title"
        className={styles.featureSection}
      >
        <div className={styles.featureInner}>
          <div className={styles.featureCopy}>
            <h2 id="inventory-title">
              Fastställ verifierade startsaldon — och håll dem aktuella
            </h2>
            <p>
              Den första inventeringen omfattar alla aktiva lagerplatser i ett
              lager och fastställer verifierade startsaldon. Därefter kan du
              skapa nya inventeringar för valda platser.
            </p>
            <p>
              Skanna platsens QR-kod, räkna produkterna och bekräfta platsen
              direkt i mobilen. StorageViewr håller koll på:
            </p>
            <ul className={styles.inventoryList}>
              <li>vilka platser som är räknade och vilka som återstår</li>
              <li>förväntat och räknat antal</li>
              <li>avvikelser som kan godkännas eller lämnas för utredning</li>
              <li>digital signatur och namnförtydligande</li>
            </ul>
            <p className={styles.featureStatement}>
              Saldona uppdateras först när alla platser har räknats och en
              administratör har granskat, signerat och slutfört inventeringen.
            </p>
          </div>

          <div className={`${styles.featureVisual} ${styles.inventoryVisual}`}>
            <div className={styles.imageGlow} aria-hidden="true" />
            <Image
              className={styles.inventoryImage}
              src="/images/Inventory-image.png"
              alt="Baseline-inventering i StorageViewr med framsteg, digital signatur och namnförtydligande"
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
        className={`${styles.featureSection} ${styles.reportsSection}`}
      >
        <div className={`${styles.featureInner} ${styles.documentsFeature}`}>
          <div className={styles.featureCopy}>
            <h2 id="documents-title">Från lagersaldo till färdiga rapporter</h2>
            <p>
              Hämta lagervärdes-, avvikelse- och lagerhälsorapporter som PDF.
              Lagervärdesrapporten kan omfatta alla lager eller ett valt lager,
              och företagets dokumentuppgifter följer med.
            </p>
            <p>
              Inventeringsrapporten visar lagerplats, produkt, förväntat och
              räknat antal, styckvärde, totalvärde och värdedifferens. Inkommande
              varuvärden, inventeringens tidpunkter och den digitala signaturen
              följer med i samma underlag när de finns registrerade.
            </p>
            <p className={styles.featureStatement}>
              Tydliga underlag — färdiga att spara, dela och följa upp.
            </p>
          </div>

          <div className={`${styles.featureVisual} ${styles.documentsVisual}`}>
            <div className={styles.imageGlow} aria-hidden="true" />
            <Image
              className={styles.documentsImage}
              src="/images/Report-image.png"
              alt="Rapporter och PDF-underlag från StorageViewr med lagervärde, inventeringsresultat och signering"
              width={1122}
              height={1402}
              sizes="(max-width: 900px) 88vw, 44vw"
            />
          </div>
        </div>
      </section>

      <div className={styles.closingFlow}>
        <section
          aria-labelledby="audience-title"
          className={styles.audienceSection}
        >
          <div className={styles.audienceInner}>
            <header className={styles.audienceHeader}>
              <h2 id="audience-title">
                Byggt för verksamheter med ett fysiskt lager.
              </h2>
            </header>
            <div className={styles.audienceDetails}>
              <p className={styles.audienceLead}>
                För mindre företag som behöver struktur på lagerplatser,
                verifierade saldon och spårbara förändringar — utan att införa
                ett tungt WMS.
              </p>
              <ul className={styles.audienceProofs} aria-label="Det viktigaste">
                {audienceProofs.map((proof) => (
                  <li key={proof.label}>
                    <AppIcon name={proof.icon} width={18} height={18} />
                    <span>{proof.label}</span>
                  </li>
                ))}
              </ul>
              <p className={styles.audiencePrompt}>Passar särskilt bra för:</p>
              <ul
                className={styles.audienceTypes}
                aria-label="Passar bland annat"
              >
                {audienceTypes.map((audience) => (
                  <li key={audience}>{audience}</li>
                ))}
              </ul>
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
                Verktygen för det dagliga lagerarbetet finns på plats.
              </h2>
              <p>
                Mobil åtkomst, tydliga behörigheter, säker produktimport och
                stöd för flera lager i samma företag.
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

        <section
          id="kom-igang"
          aria-labelledby="onboarding-title"
          className={styles.onboardingSection}
        >
          <header className={styles.onboardingHeader}>
            <h2 id="onboarding-title">
              Kom igång utan ett implementationsprojekt.
            </h2>
            <p>
              Skapa strukturen, placera produkterna och genomför den första
              fysiska inventeringen för att etablera verifierade startsaldon.
            </p>
          </header>
          <ol className={styles.onboardingSteps}>
            {onboardingSteps.map((step, index) => (
              <li key={step.title}>
                <span aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <strong>{step.title}</strong>
                  <small>{step.description}</small>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="cta-title" className={styles.ctaSection}>
          <div className={styles.ctaPanel}>
            <div className={styles.ctaCopy}>
              <h2 id="cta-title">
                Vet vad du har. Vet var det finns. Vet att saldot stämmer.
              </h2>
              <p>
                Ansök om pilot så går vi igenom ert lager och sätter upp nästa
                steg tillsammans.
              </p>
              <Link
                href={primaryHref}
                className={`${styles.primaryAction} button`}
              >
                {primaryLabel}
                <MaterialArrow name="forward" />
              </Link>
            </div>
            <div className={styles.ctaVisual}>
              <Image
                className={styles.ctaImage}
                src="/images/Final-CTA-image.png"
                alt="Förhandsvisning av pilotansökan i StorageViewr"
                width={1672}
                height={941}
                sizes="(max-width: 900px) 100vw, 52vw"
              />
            </div>
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <BrandLogo href="#toppen" />
              <div className={styles.footerDescription}>
                <p>Lagerkontroll för verksamheter med ett fysiskt lager.</p>
                <p>
                  Från fysiska lagerplatser och verifierade saldon till historik
                  och signerade rapporter.
                </p>
              </div>
              <span className={styles.footerStatus}>
                <span aria-hidden="true" />
                Begränsad pilot pågår
              </span>
            </div>

            <nav
              aria-label="Länkar i sidfoten"
              className={styles.footerNavigation}
            >
              <div className={styles.footerLinkGroup}>
                <h2>Produkt</h2>
                <a href="#oversikt">Lageröversikt</a>
                <a href="#qr-skanner">QR-skanner</a>
                <a href="#lagerplatser">Lagerplatser &amp; produkter</a>
              </div>
              <div className={styles.footerLinkGroup}>
                <h2>Arbetsflöde</h2>
                <a href="#inventering">Inventering</a>
                <a href="#rapporter">Rapporter &amp; dokument</a>
              </div>
              <div className={styles.footerLinkGroup}>
                <h2>Kom igång</h2>
                <a href="#kom-igang">Så fungerar det</a>
                <Link className={styles.footerAccentLink} href={primaryHref}>
                  {primaryLabel}
                  <MaterialArrow name="forward" size={16} />
                </Link>
                <Link href="/login">Logga in</Link>
              </div>
            </nav>
          </div>

          <div className={styles.footerBottom}>
            <span>© {new Date().getFullYear()} StorageViewr</span>
            <FooterScrollToTop />
          </div>
        </div>
      </footer>
    </main>
  );
}
