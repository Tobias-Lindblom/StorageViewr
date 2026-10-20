import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import { BrandLogo } from "@/components/brand-logo";
import { PilotForm } from "./pilot-form";
import styles from "./pilot-page.module.css";

const pilotBenefits = [
  {
    title: "Testa i verklig drift",
    description: "Använd StorageViewr med era egna produkter och lagerplatser.",
    icon: "scan",
  },
  {
    title: "Personlig uppstart",
    description:
      "Vi hjälper er att komma igång med rätt struktur från början.",
    icon: "user",
  },
  {
    title: "Direkt återkoppling",
    description:
      "Som pilotkund får ni möjlighet att påverka hur StorageViewr utvecklas.",
    icon: "chart",
  },
] as const;

const processSteps = [
  {
    title: "Vi går igenom förfrågan",
    description:
      "Vi tittar på er verksamhet och återkommer med förslag på nästa steg.",
  },
  {
    title: "Vi sätter upp piloten",
    description:
      "Tillsammans skapar vi en anpassad miljö med era data och rätt struktur.",
  },
  {
    title: "Ni testar i verkligheten",
    description:
      "Ni använder StorageViewr i ert riktiga lager och ser hur stödet fungerar i vardagen.",
  },
  {
    title: "Vi följer upp",
    description:
      "Vi stämmer av era erfarenheter och planerar nästa steg tillsammans.",
  },
];

const trustFeatures = [
  {
    title: "Mobil PWA",
    description: "Använd direkt i webbläsaren, på alla enheter i lagret.",
    icon: "dashboard",
  },
  {
    title: "QR-baserade lagerplatser",
    description: "Skapa struktur med tydliga fysiska placeringar.",
    icon: "qr",
  },
  {
    title: "Rollbaserad åtkomst",
    description: "Ge rätt behörighet till rätt personer.",
    icon: "user",
  },
  {
    title: "Full lagerhistorik",
    description: "Se alla händelser och förändringar i lagret.",
    icon: "history",
  },
  {
    title: "Inventering och avvikelser",
    description: "Få kontroll på lagersaldot och hantera avvikelser enkelt.",
    icon: "verified",
  },
  {
    title: "Rapporter och inventeringsunderlag",
    description: "Exportera data och skapa underlag på några klick.",
    icon: "download",
  },
] as const;

export default function PilotPage() {
  return (
    <main className={`viewport-page ${styles.page}`}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <BrandLogo />
          <nav aria-label="Pilotnavigation" className={styles.headerActions}>
            <Link href="/" className={styles.backLink}>
              <span className={styles.backLinkLong}>Tillbaka till startsidan</span>
              <span className={styles.backLinkShort}>Startsidan</span>
            </Link>
            <Link href="/login" className={`button-secondary ${styles.loginLink}`}>
              Logga in
            </Link>
          </nav>
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="pilot-title">
        <div className={styles.heroCopy}>
          <h1 id="pilot-title">Testa StorageViewr i ert riktiga lager.</h1>
          <div className={styles.heroIntro}>
            <p>
              StorageViewr är just nu i en begränsad pilot för verksamheter med
              ett fysiskt lager.
            </p>
            <p>
              Berätta kort om er verksamhet och ert lager. Vi går igenom
              förfrågan och återkommer med nästa steg.
            </p>
          </div>

          <ul className={styles.benefitList}>
            {pilotBenefits.map((benefit) => (
              <li key={benefit.title}>
                <span className={styles.benefitIcon} aria-hidden="true">
                  <AppIcon name={benefit.icon} width={25} height={25} />
                </span>
                <div>
                  <h2>{benefit.title}</h2>
                  <p>{benefit.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.formCard}>
          <PilotForm />
        </div>
      </section>

      <section className={styles.processSection} aria-labelledby="process-title">
        <header className={styles.sectionHeader}>
          <h2 id="process-title">Vad händer efteråt?</h2>
          <p>Från förfrågan till pilot — en enkel och tydlig process.</p>
        </header>
        <ol className={styles.processGrid}>
          {processSteps.map((step, index) => (
            <li key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.trustSection} aria-labelledby="trust-title">
        <header className={styles.sectionHeader}>
          <h2 id="trust-title">Byggt för verkligt lagerarbete.</h2>
          <p>
            Samma funktioner som på riktigt gör skillnad — redan i piloten.
          </p>
        </header>
        <ul className={styles.trustGrid}>
          {trustFeatures.map((feature) => (
            <li key={feature.title}>
              <span className={styles.trustIcon} aria-hidden="true">
                <AppIcon name={feature.icon} width={21} height={21} />
              </span>
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.finalSection} aria-labelledby="final-title">
        <h2 id="final-title">En pilot ska ge svar — inte skapa mer arbete.</h2>
        <p>
          StorageViewr ska göra det enklare att veta vad ni har, var det finns
          och om lagersaldot faktiskt stämmer.
        </p>
      </section>
    </main>
  );
}

