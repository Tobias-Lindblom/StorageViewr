"use client";

import { useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { formatSek, formatUnitValue, sekToUnits } from "@/lib/money";
import { BottomSheet } from "@/components/bottom-sheet";
import { InventoryVerification, verificationLabels } from "@/components/inventory-verification";
import type { VerificationData } from "@/features/inventory/verification";
import Link from "next/link";

export function ProductStockSummary({ total, verification, unitValue, admin }: {
  total: string; verification: VerificationData; unitValue: string | null; admin: boolean;
}) {
  const totalValueUnits = unitValue === null ? null : BigInt(total) * sekToUnits(unitValue);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const date = verification.countedAt ? new Date(verification.countedAt) : null;
  const dateLabel = date?.toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", dateStyle: "medium", timeStyle: "short" }) ?? "Ingen avslutad inventering";
  const labels = verificationLabels;
  return <>
    <div className="product-summary">
      <div className="product-total">
        <span className="product-summary-icon"><AppIcon name="layers" width={26} height={26} /></span>
        <dl><dt>Registrerat saldo</dt><dd className={total === "0" ? "is-empty" : ""}>{BigInt(total).toLocaleString("sv-SE")} st</dd>
          <small className="text-muted">Senast verifierat: {verification.verifiedQuantity === null ? "Ej komplett" : BigInt(verification.verifiedQuantity).toLocaleString("sv-SE") + " st"}</small>
        </dl>
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
          <span className="product-count-warning">Lagerhälsa {verification.healthScore === null ? "–" : verification.healthScore + "%"}</span>
          {verification.openDiscrepancies > 0 && <span className="product-count-warning">{verification.openDiscrepancies} öppna avvikelser</span>}
        </span>
      </button>
      <div className="product-valuation" aria-label="Produktens lagervärde">
        <div className="product-valuation-item">
          <span className="product-summary-icon"><AppIcon name="tag" width={21} height={21} /></span>
          <dl>
            <dt>Styckvärde</dt>
            <dd>{unitValue === null ? "Ej angivet" : formatUnitValue(unitValue)}</dd>
          </dl>
        </div>
        <div className="product-valuation-item product-valuation-total">
          <span className="product-summary-icon"><AppIcon name="coins" width={21} height={21} /></span>
          <dl>
            <dt>Totalt lagervärde</dt>
            <dd>{totalValueUnits === null ? "Ej beräknat" : formatSek(totalValueUnits)}</dd>
          </dl>
        </div>
      </div>
      {admin && verification.openDiscrepancies > 0 && <Link href="/discrepancies" className="button-secondary col-span-full">
        Visa {verification.openDiscrepancies} öppna avvikelser
      </Link>}
    </div>
    {open && <BottomSheet title="Inventeringsstatus" onClose={() => { setOpen(false); trigger.current?.focus(); }}>
      <InventoryVerification data={verification} />
    </BottomSheet>}
  </>;
}
