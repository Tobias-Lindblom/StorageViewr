import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import { BrandLogo } from "@/components/brand-logo";
import { MaterialArrow } from "@/components/material-arrow";
import { AnimatedHealthMetric } from "./animated-health-metric";
import { LandingHeader } from "./landing-header";
import { ScrollReveal } from "./scroll-reveal";
import { FloatingScrollToTop, FooterScrollToTop } from "./scroll-to-top";
import styles from "./landing-page.module.css";

export const landingMetadata: Metadata = {
  title: "StorageViewr – lagerkontroll och inventering med QR",
  description:
    "Koppla produkter till fysiska lagerplatser, inventera med QR, granska avvikelser och exportera lager- och inventeringsrapporter som PDF.",
};

const overviewFacts = [
  "Personlig pilotstart",
  "Fungerar i webbläsaren",
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
  { label: "Fysiskt inventerade saldon", icon: "verified" },
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
  { label: "Tillförlitliga positioner", value: 37, icon: "verified" },
  { label: "Öppna avvikelser", value: 2, icon: "alert" },
  { label: "Kontroll behöver förnyas", value: 1, icon: "history" },
] as const;

const supportingFeatures = [
  {
    title: "Mobil PWA",
    description: "Arbeta i webbläsaren eller lägg appen på hemskärmen.",
    icon: "dashboard",
  },
  {
    title: "Roller & behörigheter",
    description: "Bjud in administratörer eller lagerpersonal och ändra deras roll.",
    icon: "user",
  },
  {
    title: "CSV-import",
    description: "Importera produktregister med förhandsgranskning och tydliga radfel.",
    icon: "download",
  },
  {
    title: "Flera lager",
    description: "Skapa flera lager och koppla lagerplatser och inventeringar till rätt lager.",
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
            <div className={styles.heroDescription}>
              <p className={styles.lead}>
                Koppla produkter till fysiska lagerplatser, inventera med
                mobilen och se vilka saldon du faktiskt kan lita på.
              </p>
              <p className={styles.bodyCopy}>
                Avvikelser och saldoförändringar blir spårbara med lagerplats,
                tidpunkt och användare.
              </p>
            </div>

            <div className={styles.heroActionsGroup}>
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
          <ScrollReveal className={styles.healthPanel} mode="group">
            <div className={styles.healthCopy} data-reveal-item>
              <h2 id="health-title">
                Se vad som verifierats — och vad som behöver kontrolleras.
              </h2>
              <AnimatedHealthMetric />
            </div>
            <div
              className={styles.healthSummary}
              data-reveal-item
              data-reveal-order="1"
            >
              <header className={styles.healthSummaryHeader}>
                <h3>Lagerhälsa</h3>
                <p>
                  StorageViewr utgår från den senaste fysiska inventeringen och
                  följer registrerade lagerhändelser därefter. Om kedjan bryts
                  markeras positionen för kontroll.
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
                  Exemplet visar två öppna avvikelser och en kontroll som
                  behöver förnyas.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section
        id="qr-skanner"
        aria-labelledby="scanner-title"
        className={styles.featureSection}
      >
        <ScrollReveal className={styles.featureInner} mode="group">
          <div className={styles.featureCopy} data-reveal-item>
            <h2 id="scanner-title">
              Skanna lagerplatsen och fortsätt där arbetet sker
            </h2>
            <p>
              Skapa QR-etiketter för aktiva lagerplatser. En skanning öppnar
              rätt plats eller fortsätter en pågående inventering. Där ser du
              placerade produkter och kan inventera, registrera inleverans,
              flytta material eller korrigera saldo.
            </p>
            <p className={styles.featureStatement}>
              Samma skanner fungerar i webbläsaren och den installerade PWA:n.
            </p>
          </div>

          <div
            className={`${styles.featureVisual} ${styles.scannerVisual}`}
            data-reveal-item
            data-reveal-order="1"
            data-reveal-from="left"
          >
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
        </ScrollReveal>
      </section>

      <section
        id="lagerplatser"
        aria-labelledby="storage-title"
        className={styles.featureSection}
      >
        <ScrollReveal
          className={`${styles.featureInner} ${styles.storageFeature}`}
          mode="group"
        >
          <div className={styles.featureCopy} data-reveal-item>
            <h2 id="storage-title">
              Se saldot — och exakt var produkterna finns
            </h2>
            <p>
              Se registrerat totalantal, styckvärde och lagervärde — och hur
              varje produkt är fördelad mellan fysiska lagerplatser.
            </p>
            <p className={styles.featureStatement}>
              Inleveranser, flyttar, inventeringar och korrigeringar sparas med
              tidpunkt och användare.
            </p>
          </div>

          <div
            className={`${styles.featureVisual} ${styles.storageVisual}`}
            data-reveal-item
            data-reveal-order="1"
            data-reveal-from="right"
          >
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
        </ScrollReveal>
      </section>

      <section
        id="inventering"
        aria-labelledby="inventory-title"
        className={styles.featureSection}
      >
        <ScrollReveal className={styles.featureInner} mode="group">
          <div className={styles.featureCopy} data-reveal-item>
            <h2 id="inventory-title">
              Fastställ startsaldon och följ upp med nya inventeringar
            </h2>
            <p>
              Den första inventeringen fastställer verifierade startsaldon för
              lagrets aktiva platser. Därefter kan du inventera valda platser
              vid behov.
            </p>
            <ul className={styles.inventoryList}>
              <li>räknade och återstående platser</li>
              <li>förväntat och räknat antal samt avvikelser</li>
              <li>digital signatur och namnförtydligande</li>
            </ul>
            <p className={styles.featureStatement}>
              Saldona uppdateras när en administratör signerar och slutför
              inventeringen.
            </p>
          </div>

          <div
            className={`${styles.featureVisual} ${styles.inventoryVisual}`}
            data-reveal-item
            data-reveal-order="1"
            data-reveal-from="left"
          >
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
        </ScrollReveal>
      </section>

      <section
        id="rapporter"
        aria-labelledby="documents-title"
        className={`${styles.featureSection} ${styles.reportsSection}`}
      >
        <ScrollReveal
          className={`${styles.featureInner} ${styles.documentsFeature}`}
          mode="group"
        >
          <div className={styles.featureCopy} data-reveal-item>
            <h2 id="documents-title">Från lagersaldo till färdiga rapporter</h2>
            <p>
              Hämta lagervärdesrapport för alla lager eller ett valt lager samt
              företagsövergripande avvikelse- och lagerhälsorapporter som PDF.
            </p>
            <p>
              Inventeringsrapporten samlar räknade antal, värdedifferenser,
              inkommande varuvärden, tidpunkter och digital signatur.
            </p>
            <p className={styles.featureStatement}>
              Rapporterna innehåller företagets sparade dokumentuppgifter.
            </p>
          </div>

          <div
            className={`${styles.featureVisual} ${styles.documentsVisual}`}
            data-reveal-item
            data-reveal-order="1"
            data-reveal-from="right"
          >
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
        </ScrollReveal>
      </section>

      <div className={styles.closingFlow}>
        <section
          aria-labelledby="audience-title"
          className={styles.audienceSection}
        >
          <ScrollReveal className={styles.audienceInner} mode="group">
            <header className={styles.audienceHeader} data-reveal-item>
              <h2 id="audience-title">
                Byggt för verksamheter med ett fysiskt lager.
              </h2>
            </header>
            <div
              className={styles.audienceDetails}
              data-reveal-item
              data-reveal-order="1"
            >
              <p className={styles.audienceLead}>
                För mindre företag som behöver bättre fysisk lagerkontroll{` `}
                <strong>utan att införa ett tungt WMS.</strong>
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
          </ScrollReveal>
        </section>

        <section
          aria-labelledby="supporting-features-title"
          className={styles.supportingSection}
        >
          <ScrollReveal className={styles.supportingInner} mode="group">
            <header className={styles.supportingHeader} data-reveal-item>
              <h2 id="supporting-features-title">
                Verktygen för det dagliga lagerarbetet finns på plats.
              </h2>
              <p>
                Mobil PWA, två användarroller, CSV-import med förhandsgranskning
                och flera lager i samma företag.
              </p>
            </header>

            <ul className={styles.capabilityGrid}>
              {supportingFeatures.map((feature, index) => (
                <li
                  key={feature.title}
                  className={styles.capabilityCard}
                  data-reveal-item
                  data-reveal-order={index + 1}
                >
                  <span className={styles.capabilityIcon} aria-hidden="true">
                    <AppIcon name={feature.icon} width={23} height={23} />
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </li>
              ))}
            </ul>
          </ScrollReveal>
        </section>

        <section
          id="kom-igang"
          aria-labelledby="onboarding-title"
          className={styles.onboardingSection}
        >
          <ScrollReveal mode="group">
            <header className={styles.onboardingHeader} data-reveal-item>
              <h2 id="onboarding-title">Kom igång i fem konkreta steg.</h2>
              <p>
                Skapa lager och platser, lägg till produkter, placera dem och
                genomför den första fysiska inventeringen.
              </p>
            </header>
            <ol className={styles.onboardingSteps}>
              {onboardingSteps.map((step, index) => (
                <li
                  key={step.title}
                  data-reveal-item
                  data-reveal-order={index + 1}
                >
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
          </ScrollReveal>
        </section>

        <section aria-labelledby="cta-title" className={styles.ctaSection}>
          <ScrollReveal className={styles.ctaPanel}>
            <div className={styles.ctaCopy}>
              <h2 id="cta-title">
                Vet vad du har. Vet var det finns. Se när det senast verifierades.
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
          </ScrollReveal>
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
                  Från lagerplatser och fysiska inventeringar till spårbar
                  historik och signerade inventeringsrapporter.
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
