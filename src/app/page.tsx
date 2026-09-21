import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import { InventoryPreview } from "@/components/inventory-preview";

const steps = [
  {
    number: "01",
    title: "Hitta rätt plats",
    text: "En QR-kod på hyllan gör det enkelt att hitta produkterna där de faktiskt ligger.",
  },
  {
    number: "02",
    title: "Räkna på mobilen",
    text: "Ange det du ser framför dig. Ett tydligt flöde, direkt ute på lagret.",
  },
  {
    number: "03",
    title: "Följ upp skillnaden",
    text: "Se vilka antal som avviker och följ lagerförändringarna i historiken.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
      <header className="flex min-h-24 items-center justify-between gap-4 border-b border-line/50">
        <BrandLogo />
        <nav aria-label="Huvudmeny" className="flex items-center gap-8">
          <Link className="button-secondary min-h-11! px-4!" href="/login">
            Logga in
          </Link>
        </nav>
      </header>

      <section className="grid items-center gap-8 pb-8 pt-14 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:py-20">
        <div className="min-w-0">
          <h1 className="hero-title mb-6">
            Ditt lager.
            <br />I din ficka.
            <br />
            <span className="gradient-text">Under kontroll.</span>
          </h1>
          <p className="mb-8 max-w-lg text-base leading-7 text-muted sm:text-lg sm:leading-8">
            Vi bygger ett enklare sätt att se vad som finns, var det ligger och
            om antalet stämmer. För små företag med riktiga lager.
          </p>
          <div className="flex flex-col gap-3 min-[400px]:flex-row">
            <Link href="/register" className="button">
              Skapa ditt konto <span aria-hidden="true">↗</span>
            </Link>
            <Link href="#flode" className="button-secondary">
              Utforska flödet{" "}
              <span className="ml-3 text-accent" aria-hidden="true">
                ↓
              </span>
            </Link>
          </div>
          <p className="mt-5 text-xs leading-6 text-muted">
            Under utveckling · Börja med ditt konto och företag.
          </p>
        </div>
        <InventoryPreview />
      </section>

      <section
        id="flode"
        className="scroll-mt-8 border-t border-line/60 py-12 sm:py-16"
      >
        <div className="mb-9 max-w-xl">
          <h2 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Från hylla till överblick.
          </h2>
          <p className="leading-7 text-muted">
            Byggt med mobilen i åtanke. Med utrymme för administration på en
            större skärm.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.number} className="panel p-6!">
              <span className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10 font-mono text-sm text-accent">
                {step.number}
              </span>
              <h3 className="mb-3 text-lg font-semibold">{step.title}</h3>
              <p className="text-sm leading-7 text-muted">{step.text}</p>
            </article>
          ))}
        </div>
      </section>
      <footer className="flex flex-col gap-3 border-t border-line/60 py-7 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-semibold text-foreground">
          StorageViewr<span className="text-accent">.</span>
        </span>
        <p>Ordning på produkter, platser och antal.</p>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center text-accent hover:text-cyan"
        >
          Till ditt arbetsutrymme{" "}
          <span className="ml-2" aria-hidden="true">
            →
          </span>
        </Link>
      </footer>
    </main>
  );
}
