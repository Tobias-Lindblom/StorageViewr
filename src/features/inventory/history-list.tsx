"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { BottomSheet } from "@/components/bottom-sheet";
import { movementLabel } from "@/features/inventory/movement-label";
import type { HistoryItem } from "./history-service";

function label(item: HistoryItem) {
  return item.type === "TRANSFER" ? "Flytt" : movementLabel(item.type);
}
function time(value: string) {
  return new Date(value).toLocaleString("sv-SE", {
    timeZone: "Europe/Stockholm", dateStyle: "medium", timeStyle: "short",
  });
}
export function HistoryList({ items }: { items: HistoryItem[] }) {
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  function close() {
    setSelected(null);
    requestAnimationFrame(() => trigger.current?.focus());
  }
  return <>
    <ol className="history-list">
      {items.map(item => {
        const transfer = item.type.startsWith("TRANSFER");
        const inventory = item.type === "INVENTORY";
        const correction = item.type === "CORRECTION" || item.type === "ADJUSTMENT";
        const tone = transfer ? "neutral" : inventory || (item.difference ?? 0) < 0 ? "danger" : "success";
        const amount = item.difference === null ? "" :
          (item.difference > 0 && !transfer ? "+" : "") + item.difference.toLocaleString("sv-SE");
        const title = transfer || inventory || correction ? label(item) : item.productName;
        return <li key={item.id}>
          <button type="button" className="history-row" aria-haspopup="dialog"
            onClick={event => { trigger.current = event.currentTarget; setSelected(item); }}>
            <span className={"history-marker is-" + tone} aria-hidden="true">
              {inventory || amount.length > 6
                ? <AppIcon name={inventory ? "inventory" : transfer ? "transfer" : (item.difference ?? 0) < 0 ? "minus" : "plus"} width={23} height={23} />
                : <span className={amount.length > 4 ? "history-small-amount" : ""}>{amount}</span>}
            </span>
            <span className="history-identity">
              <span className="history-title">{title}</span>
              <span className="history-place">{item.locationCode}</span>
              <time dateTime={item.createdAt}>{time(item.createdAt)}</time>
              <span className="sr-only">{label(item)}{item.productName && " · " + item.productName}
                {item.difference !== null && " · " + amount + " st"}. Visa händelsedetaljer.</span>
            </span>
            <AppIcon name="chevron" className="history-row-arrow" width={16} height={16} />
          </button>
        </li>;
      })}
    </ol>
    {selected && <BottomSheet title={label(selected)} onClose={close}
      footer={selected.inventorySessionId ? <Link href={"/inventories/" + selected.inventorySessionId}
        className="button w-full">Visa inventering <AppIcon name="chevron" width={17} height={17} /></Link> : undefined}>
      <div className="history-event-details">
        {selected.productName && <div className="history-event-product">
          <strong>{selected.productName}</strong><span>SKU {selected.sku}</span>
        </div>}
        <dl className="history-event-meta">
          <div><dt>Lagerplats</dt><dd>{selected.locationCode}</dd></div>
          <div><dt>Lager</dt><dd>{selected.warehouseName}</dd></div>
          <div><dt>Tid</dt><dd><time dateTime={selected.createdAt}>{time(selected.createdAt)}</time></dd></div>
          <div><dt>Utförare</dt><dd>{selected.performedByName}</dd></div>
          {selected.difference !== null && <div><dt>{selected.type === "TRANSFER" ? "Flyttat antal" : "Saldoändring"}</dt>
            <dd>{selected.difference > 0 && selected.type !== "TRANSFER" ? "+" : ""}
              {selected.difference.toLocaleString("sv-SE")} st</dd></div>}
        </dl>
        <section><h3>{selected.type === "INVENTORY" && !selected.productName ? "Inventering" : "Orsak"}</h3>
          <p>{selected.reason}</p></section>
        {selected.balances.length > 0 && <section>
          <h3>{selected.type === "INVENTORY" && !selected.productName ? "Saldokorrigeringar" : "Saldo före och efter"}</h3>
          <ul className="history-balance-list">
            {selected.balances.map(balance => <li key={balance.id}>
              {selected.balances.length > 1 && <strong>{balance.productName} · {balance.locationCode}</strong>}
              <span>{balance.warehouseName}</span>
              <p>{balance.previousQuantity.toLocaleString("sv-SE")} <span aria-label="till">→</span> {balance.newQuantity.toLocaleString("sv-SE")} st</p>
              {balance.reason !== selected.reason && <span>{balance.reason}</span>}
            </li>)}
          </ul>
        </section>}
      </div>
    </BottomSheet>}
  </>;
}
