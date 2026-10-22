"use client";

import { useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { BottomSheet } from "@/components/bottom-sheet";
import { InventoryVerification, verificationLabels } from "@/components/inventory-verification";
import type { VerificationData } from "@/features/inventory/verification";
import Link from "next/link";

export function LocationVerification({ data, admin }: { data: VerificationData; admin: boolean }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const date = data.countedAt ? new Date(data.countedAt) : null;
  const label = verificationLabels[data.state];
  const dateLabel = date ? date.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Stockholm" }).replace(/\./g, "") + ", " + date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" }) : "Ingen avslutad inventering";
  const note = data.state === "changed" ? "Saldot har ändrats efter räkningen." :
    data.state === "partial" ? "Alla aktuella produkter är ännu inte räknade." :
    data.state === "old" ? "Minst 30 dagar sedan den fysiska kontrollen." :
    date ? data.checked + (data.checked === 1 ? " produkt räknades" : " produkter räknades") +
      " · " + (data.corrections ? data.corrections + " avvikelser korrigerades" : "Ingen avvikelse") :
    "Inventera platsen för att kontrollera lagret.";
  const health = data.healthScore === null ? "Lagerhälsa kan ännu inte beräknas." :
    "Lagerhälsa " + data.healthScore + "%" + (data.openDiscrepancies ? " · " + data.openDiscrepancies + " öppna avvikelser" : "");
  return <>
    <button type="button" ref={trigger} className="location-verification" aria-haspopup="dialog"
      aria-label={"Senast inventerad, " + dateLabel + ", " + label + ". Visa inventeringsstatus"}
      onClick={() => setOpen(true)}>
      <span className="product-summary-icon"><AppIcon name="inventory" width={21} height={21} /></span>
      <span className="location-verification-body">
        <span className="location-verification-title"><span>Senast inventerad</span>
          <span className={"location-verification-badge " + (data.state === "verified" ? "is-verified" : data.state === "never" ? "is-never" : "needs-counting")}>{label}</span>
        </span>
        {date ? <time dateTime={data.countedAt ?? undefined}>{dateLabel}</time> : <span className="location-verification-none">Ej inventerad</span>}
        <span className="location-verification-note">{note}</span>
        <span className="location-verification-note">{health}</span>
      </span>
      <AppIcon name="chevron" width={15} height={15} className="shrink-0 text-muted" />
    </button>
    {open && <BottomSheet title="Inventeringsstatus" onClose={() => { setOpen(false); trigger.current?.focus(); }}>
      <InventoryVerification data={data} />
      {admin && data.openDiscrepancies > 0 && <Link href="/discrepancies" className="button-secondary mt-4 w-full">
        Visa {data.openDiscrepancies} öppna avvikelser
      </Link>}
    </BottomSheet>}
  </>;
}
