"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AppIcon } from "@/components/app-icon";
import { BottomSheet } from "@/components/bottom-sheet";
import { formatSek, formatUnitValue } from "@/lib/money";
import type { DiscrepancyRow } from "./discrepancies";

type Action = "INVESTIGATE" | "APPROVE" | "RESOLVE";

export function DiscrepancyList({ items }: { items: DiscrepancyRow[] }) {
  const [selected, setSelected] = useState<DiscrepancyRow | null>(null);
  const [action, setAction] = useState<Action>("INVESTIGATE");
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function open(item: DiscrepancyRow, nextAction: Action) {
    setSelected(item); setAction(nextAction); setComment(item.comment); setError("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected || pending) return;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/inventory/discrepancies/" + selected.id, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.details?.[0]?.message ?? result.error?.message ?? "Avvikelsen kunde inte uppdateras.");
      setSelected(null); router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Avvikelsen kunde inte uppdateras.");
    } finally { setPending(false); }
  }

  return <>
    <ol className="history-list discrepancy-list">
      {items.map(item => <li key={item.id}>
        <article className="history-row discrepancy-row">
          <span className="history-marker is-danger"><AppIcon name="alert" width={22} height={22} /></span>
          <div className="history-identity">
            <strong className="history-title">{item.productName}</strong>
            <span className="history-place">{item.warehouseName} · {item.locationCode} · SKU {item.sku}</span>
            <span>Registrerat {item.expectedQuantity.toLocaleString("sv-SE")} · Räknat {item.countedQuantity.toLocaleString("sv-SE")}</span>
            <strong className={item.difference < 0 ? "text-destructive" : "text-success"}>
              {item.difference > 0 ? "+" : ""}{item.difference.toLocaleString("sv-SE")} st
              {item.valueDifferenceUnits !== null && <> · {item.difference > 0 ? "+" : ""}{formatSek(BigInt(item.valueDifferenceUnits))}</>}
            </strong>
            {item.unitValue !== null && <small>Styckvärde {formatUnitValue(item.unitValue)}</small>}
            {item.comment && <small>Kommentar: {item.comment}</small>}
          </div>
          <div className="report-actions discrepancy-actions">
            <Link href={"/locations/" + item.locationId}>Räkna igen</Link>
            <button type="button" onClick={() => open(item, "INVESTIGATE")}>Utred</button>
            <button type="button" onClick={() => open(item, "APPROVE")}>Godkänn saldo</button>
            <button type="button" onClick={() => open(item, "RESOLVE")}>Lös</button>
          </div>
        </article>
      </li>)}
    </ol>
    {selected && <BottomSheet title={action === "APPROVE" ? "Godkänn räknat saldo" : action === "RESOLVE" ? "Lös avvikelse" : "Markera för utredning"} onClose={() => setSelected(null)}
      footer={<button type="submit" form="discrepancy-action-form" className="button w-full" disabled={pending}>{pending ? "Sparar…" : action === "APPROVE" ? "Godkänn räknat saldo" : action === "RESOLVE" ? "Lös avvikelse" : "Spara kommentar"}</button>}>
      <form id="discrepancy-action-form" className="space-y-5" onSubmit={submit}>
        <div className="rounded-lg bg-canvas p-4 text-sm">
          <strong>{selected.productName}</strong><p className="mt-1 text-muted">{selected.locationCode} · {selected.expectedQuantity} → {selected.countedQuantity} st</p>
        </div>
        {action === "APPROVE" && <p className="text-sm leading-6 text-muted">Det räknade saldot blir nytt registrerat saldo. Åtgärden stoppas om saldot har ändrats efter inventeringen.</p>}
        {action === "RESOLVE" && <p className="text-sm leading-6 text-muted">Avvikelsen stängs utan att det registrerade saldot ändras.</p>}
        <label>Kommentar {action === "APPROVE" && <span className="text-muted">(valfritt)</span>}
          <textarea value={comment} onChange={event => setComment(event.target.value)} required={action !== "APPROVE"} minLength={action === "APPROVE" ? undefined : 2} maxLength={500} rows={4} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
      </form>
    </BottomSheet>}
  </>;
}
