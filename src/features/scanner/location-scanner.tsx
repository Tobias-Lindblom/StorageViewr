"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { QrScanner } from "./qr-scanner";

type Place = { id: string; code: string; warehouseName: string; qrToken: string };
export function LocationScanner() {
  const router = useRouter();
  const [places, setPlaces] = useState<Place[]>([]);
  return <>
    <QrScanner locationCode="A-01-03"
      description="Rikta kameran mot en QR-etikett. Du kan också ange platskoden manuellt."
      actionLabel="Öppna lagerplats" resolveCode={async (input, signal) => {
        setPlaces([]);
        const response = await fetch("/api/locations/scan", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input), signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.details?.[0]?.message ?? result.error?.message ?? "Platsen kunde inte öppnas.");
        if (signal.aborted) return;
        const matches: Place[] = result.data;
        if (matches.length === 1) router.push("/location/" + matches[0].qrToken);
        else setPlaces(matches);
      }} />
    {places.length > 1 && <section className="stock-card mt-5">
      <h2 className="mb-0! text-base!">Välj lager</h2>
      <p className="text-sm text-muted">Platskoden finns i flera lager.</p>
      {places.map(place => <Link key={place.id} className="button-secondary" href={"/location/" + place.qrToken}>{place.warehouseName} · {place.code}</Link>)}
    </section>}
  </>;
}
