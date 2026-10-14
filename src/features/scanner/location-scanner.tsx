"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { QrScanner } from "./qr-scanner";

type Place = { id: string; code: string; warehouseName: string; qrToken: string };
export function LocationScanner({ active = true, onResolved }: { active?: boolean; onResolved?: () => void }) {
  const router = useRouter();
  const [places, setPlaces] = useState<Place[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (places.length > 1) heading.current?.focus(); }, [places]);
  if (places.length > 1) return <section className="scanner-choices">
    <h3 ref={heading} tabIndex={-1}>Välj lager</h3>
    <p>Platskoden finns i flera lager. Välj rätt lagerplats.</p>
    <ul>{places.map(place => <li key={place.id}>
      <Link href={"/location/" + place.qrToken} onClick={onResolved}>
        <AppIcon name="location" width={24} height={24} />
        <span><strong>{place.code}</strong><span>{place.warehouseName}</span></span>
        <AppIcon name="chevron" width={16} height={16} />
      </Link>
    </li>)}</ul>
    <button type="button" className="scanner-retry" onClick={() => setPlaces([])}>Tillbaka till skanning</button>
  </section>;
  return <QrScanner locationCode="A-01-03" compact active={active}
    description="Rikta kameran mot en QR-etikett. Du kan också ange platskoden manuellt."
    actionLabel="Öppna lagerplats" resolveCode={async (input, signal) => {
      const response = await fetch("/api/locations/scan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input), signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.details?.[0]?.message ?? result.error?.message ?? "Platsen kunde inte öppnas.");
      if (signal.aborted) return;
      const matches: Place[] = result.data;
      if (matches.length === 1) {
        onResolved?.();
        router.push("/location/" + matches[0].qrToken);
      } else setPlaces(matches);
    }} />;
}
