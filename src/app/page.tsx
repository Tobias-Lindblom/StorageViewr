import { MaterialArrow } from "@/components/material-arrow";
import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import { InventoryPreview } from "@/components/inventory-preview";

const steps = [
  {
    number: "01",
    title: "Strukturera lagret",
    text: "Skapa lager och platser, skriv ut QR-etiketter och se direkt vilka platser som är tomma eller upptagna.",
  },
  {
    number: "02",
    title: "Registrera händelser",
    text: "Hantera inleveranser, uttag och interna flyttar med en spårbar historik för varje saldo.",
  },
  {
    number: "03",
    title: "Inventera och följ upp",
    text: "Skanna platsen, räkna på mobilen, granska avvikelser och exportera resultatet som PDF.",
  },
];

const highlights = [
  "QR-märkta lagerplatser",
  "Spårbar saldohistorik",
  "Mobil inventering",
  "PDF-rapporter",
];

export default function Home() {
  return (
    <main id="toppen" className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
      <header className="flex min-h-20 items-center justify-between gap-4 sm:min-h-22">
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
            Samla lagerplatser, produkter, saldon och inventeringar i ett
            mobilanpassat system. För mindre företag som vill veta vad som
            finns och var det ligger.
          </p>
          <div className="flex flex-col gap-3 min-[400px]:flex-row">
            <Link href="/register" className="button">
              Skapa konto{" "}
              <span aria-hidden="true">
                <MaterialArrow name="outward" />
              </span>
            </Link>
            <Link href="#flode" className="button-secondary">
              Se hur det fungerar{" "}
              <span className="ml-3 text-accent" aria-hidden="true">
                <MaterialArrow name="down" />
              </span>
            </Link>
          </div>
          <ul className="mt-6 flex max-w-xl flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
            {highlights.map((highlight) => (
              <li key={highlight} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-accent"
                />
                {highlight}
              </li>
            ))}
          </ul>
        </div>
        <InventoryPreview />
      </section>

      <section
        id="flode"
        className="scroll-mt-8 border-t border-line/60 py-12 sm:py-16"
      >
        <div className="mb-9 max-w-xl">
          <h2 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Från lagerplats till färdig rapport.
          </h2>
          <p className="leading-7 text-muted">
            Ett sammanhängande arbetsflöde på mobilen, med överblick och
            administration när du behöver det.
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
      <footer className="flex flex-col gap-6 border-t border-line/60 py-8 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
        <div>
          <BrandLogo />
          <p className="mt-3 text-sm leading-6 text-muted">
            Ditt lager. Under kontroll.
          </p>
        </div>
        <p className="text-xs leading-6 text-muted">
          © {new Date().getFullYear()} StorageViewr.
        </p>
      </footer>
    </main>
  );
}
