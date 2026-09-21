"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-xl px-6 py-20"><h1>Sidan kunde inte laddas.</h1><p className="mb-6 text-muted">Försök igen om en stund.</p><button className="button" onClick={reset}>Försök igen</button></main>;
}
