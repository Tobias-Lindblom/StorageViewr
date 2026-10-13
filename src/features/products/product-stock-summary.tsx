"use client";

import { useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { BottomSheet } from "@/components/bottom-sheet";
import { InventoryVerification } from "@/components/inventory-verification";
import type { VerificationData } from "@/features/inventory/verification";

export function ProductStockSummary({ total, verification }: { total: string; verification: VerificationData }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const date = verification.countedAt ? new Date(verification.countedAt) : null;
  const dateLabel = date?.toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", dateStyle: "medium", timeStyle: "short" }) ?? "Ingen avslutad inventering";
  const labels = { never: "Ej inventerad", partial: "Behöver räknas", changed: "Saldo ändrat", old: "Behöver verifieras", verified: "Verifierad" };
  return <>
    <div className="product-summary">
      <div className="product-total">
        <span className="product-summary-icon"><AppIcon name="layers" width={26} height={26} /></span>
        <dl><dt>Totalt saldo</dt><dd className={total === "0" ? "is-empty" : ""}>{BigInt(total).toLocaleString("sv-SE")} st</dd></dl>
      </div>
      <button type="button" className="product-last-count" aria-haspopup="dialog"
        aria-label={"Senast inventerad, " + dateLabel + ", " + labels[verification.state] + ". Visa inventeringsstatus"}
        ref={trigger} onClick={() => setOpen(true)}>
        <span className="product-summary-icon"><AppIcon name="inventory" width={21} height={21} /></span>
        <span className="product-count-text">
          <span className="product-summary-label">Senast inventerad</span>
          {date ? <time dateTime={verification.countedAt ?? undefined}>
            <span>{date.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Stockholm" }).replace(/\./g, "")}</span>
            <span>{date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" })}</span>
          </time> : <span className="product-count-none">Ej inventerad</span>}
          {date && verification.state !== "verified" && <span className="product-count-warning">{labels[verification.state]}</span>}
        </span>
      </button>
    </div>
    {open && <BottomSheet title="Inventeringsstatus" onClose={() => { setOpen(false); trigger.current?.focus(); }}>
      <InventoryVerification data={verification} />
    </BottomSheet>}
  </>;
}
