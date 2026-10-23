"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import type { getDashboard } from "./service";
import { AppIcon } from "@/components/app-icon";
import { BottomSheet } from "@/components/bottom-sheet";
import type { InventoryHealthReason } from "@/features/inventory/inventory-health";

const labels: Record<InventoryHealthReason, string> = {
  VERIFIED: "Verifierad",
  DUE_SOON: "Behöver snart verifieras",
  NEEDS_VERIFICATION: "Behöver verifieras",
  NEVER_COUNTED: "Aldrig inventerad",
  STALE: "Senast räknad för över 90 dagar sedan",
  OPEN_DISCREPANCY: "Öppen inventeringsavvikelse",
  MANUAL_CORRECTION: "Saldot har korrigerats sedan senaste kontrollen",
  LEDGER_MISMATCH: "Saldot kan inte verifieras mot lagerhistoriken",
};

export function DashboardInsights({ dashboard }: { dashboard: Awaited<ReturnType<typeof getDashboard>> }) {
  const { health } = dashboard.insights;
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const progress = Math.min(100, Math.max(0, health.score ?? 0));
  const attention = Math.max(0, health.totalPositions - health.trustedPositions);
  const healthTone = health.score === null ? "empty" :
    health.openDiscrepancies > 0 || progress < 60 ? "critical" :
      progress < 90 ? "attention" : "healthy";
  const metrics = [
    { count: health.trustedPositions, text: "Verifierade positioner", icon: "product" as const, tone: "success" },
    { count: health.openDiscrepancies, text: "Öppna avvikelser", icon: "alert" as const, tone: "danger" },
    { count: health.stale, text: "Gamla kontroller", icon: "history" as const, tone: "warning" },
  ];
  return <>
    <section className={"dashboard-health dashboard-card health-tone-" + healthTone} aria-labelledby="warehouse-health-heading">
      <button type="button" className="dashboard-card-heading dashboard-health-heading" ref={trigger} onClick={() => setOpen(true)}>
        <h2 id="warehouse-health-heading"><AppIcon name="heart" width={21} height={21} />Lagerhälsa</h2>
        <AppIcon name="chevron" width={17} height={17} />
      </button>
      <button type="button" className="health-primary" onClick={() => setOpen(true)}
        aria-label={health.score === null ? "Lagerhälsa kan ännu inte beräknas. Visa detaljer" : "Lagerhälsa " + progress + " procent. Visa detaljer"}>
        <div className="health-score-row">
          <div className="health-progress" role="progressbar" aria-label="Betrodda fysiska lagerpositioner"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={health.score === null ? undefined : progress}
            aria-valuetext={health.score === null ? "Ingen fysisk lagerdata att bedöma" : progress + " procent"}>
            <span style={{ width: progress + "%" }} />
          </div>
          <strong>{health.score === null ? "—" : progress + "%"}</strong>
        </div>
        {health.score === null
          ? <p>Inventera era första lagerplatser för att skapa en verifierad baslinje.</p>
          : <p>{health.trustedPositions.toLocaleString("sv-SE")} av {health.totalPositions.toLocaleString("sv-SE")} lagerpositioner är verifierade</p>}
        <p className="health-attention"><AppIcon name="alert" width={15} height={15} />
          {attention.toLocaleString("sv-SE")} behöver uppmärksamhet</p>
      </button>
      <ul className="health-metrics">
        {metrics.map(metric => (
          <li key={metric.text}>
            <AppIcon name={metric.icon} width={22} height={22} className={"metric-" + metric.tone} />
            <span><strong>{metric.count.toLocaleString("sv-SE")}</strong><small>{metric.text}</small></span>
          </li>
        ))}
      </ul>
    </section>
    {open && <BottomSheet title="Lagerhälsa" onClose={() => { setOpen(false); trigger.current?.focus(); }}>
      <div className={"health-details-summary health-tone-" + healthTone}>
        <strong>{health.score === null ? "—" : health.score + "%"}</strong>
        <div><p>{health.trustedPositions.toLocaleString("sv-SE")} av {health.totalPositions.toLocaleString("sv-SE")} positioner är betrodda</p>
          <span>Fysisk kontroll och obruten lagerhistorik avgör resultatet.</span></div>
      </div>
      {health.openDiscrepancies > 0 && <Link href="/discrepancies" className="button-secondary mb-4 w-full" onClick={() => setOpen(false)}>
        Visa {health.openDiscrepancies.toLocaleString("sv-SE")} öppna avvikelser
      </Link>}
      {health.attentionItems.length ? <section className="health-details-attention" aria-labelledby="health-attention-heading">
        <h3 id="health-attention-heading">Behöver uppmärksamhet</h3>
        <ul>{health.attentionItems.map(item => <li key={item.productId + ":" + item.locationId}>
          <Link href={"/products/" + item.productId} onClick={() => setOpen(false)}>
            <span className={"health-reason is-" + item.reason.toLowerCase()}><AppIcon name={item.reason === "OPEN_DISCREPANCY" || item.reason === "LEDGER_MISMATCH" ? "alert" : "history"} width={18} height={18} /></span>
            <span className="health-item-copy"><strong>{item.productName}</strong><small>{item.warehouseName} · {item.locationCode} · SKU {item.sku}</small>
              <em>{labels[item.reason]}</em>
              {item.discrepancy && <small>Förväntat {item.discrepancy.expectedQuantity.toLocaleString("sv-SE")} · Räknat {item.discrepancy.countedQuantity.toLocaleString("sv-SE")}</small>}
            </span>
            <AppIcon name="chevron" width={16} height={16} />
          </Link>
          <div className="health-item-links">
            {item.discrepancy && <Link href={"/inventories/" + item.discrepancy.inventorySessionId} onClick={() => setOpen(false)}>Visa inventering</Link>}
            <Link href={"/locations/" + item.locationId} onClick={() => setOpen(false)}>Öppna lagerplats</Link>
          </div>
        </li>)}</ul>
        {health.attentionItems.length >= 50 && <p className="health-details-limit">De 50 högst prioriterade positionerna visas.</p>}
      </section> : <div className="health-details-empty"><AppIcon name={health.score === null ? "inventory" : "verified"} width={23} height={23} />
        <div><strong>{health.score === null ? "Ingen fysisk lagerdata ännu" : "Alla positioner är spårbara"}</strong>
          <p>{health.score === null ? "Inventera en lagerplats för att skapa den första baslinjen." : "Det finns inget som behöver åtgärdas just nu."}</p></div>
      </div>}
      {health.productsWithoutInventory > 0 && <p className="health-unplaced">
        {health.productsWithoutInventory.toLocaleString("sv-SE")} {health.productsWithoutInventory === 1 ? "produkt saknar" : "produkter saknar"} lagerplats och ingår därför inte i poängen.
      </p>}
    </BottomSheet>}
  </>;
}
