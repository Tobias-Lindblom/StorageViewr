"use client";
import { AppIcon } from "@/components/app-icon";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="viewport-page system-state-page">
      <section className="system-state" role="alert">
        <span className="system-state-icon is-danger"><AppIcon name="alert" width={24} height={24} /></span>
        <h1>Sidan kunde inte laddas</h1>
        <p>Försök igen om en stund. Dina registrerade uppgifter påverkas inte.</p>
        <button className="button" onClick={reset}>Försök igen</button>
      </section>
    </main>
  );
}
