"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { AppIcon } from "@/components/app-icon";

export function HistoryFilters({ q, kind, productId, locationId }: {
  q: string; kind: string; productId?: string; locationId?: string;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const scope = new URLSearchParams(productId ? { productId } : locationId ? { locationId } : {});
  function close() {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }
  return <>
    <button type="button" ref={trigger} className="product-filter-trigger" aria-haspopup="dialog"
      aria-label={kind !== "all" ? "Filter, aktiva filter" : "Filter"} onClick={() => setOpen(true)}>
      <AppIcon name="filter" width={20} height={20} />
      {kind !== "all" && <span className="product-filter-dot" aria-hidden="true" />}
    </button>
    {open && <BottomSheet title="Filtrera historik" onClose={close}
      footer={<button type="submit" form="history-filter-form" className="button w-full">Tillämpa filter</button>}>
      <form id="history-filter-form" action="/inventory/history" className="space-y-5">
        <input type="hidden" name="q" value={q} />
        {productId && <input type="hidden" name="productId" value={productId} />}
        {locationId && <input type="hidden" name="locationId" value={locationId} />}
        <label>Händelsetyp<select name="kind" defaultValue={kind}>
          <option value="all">Alla händelser</option>
          <option value="receipt">Inleverans</option><option value="inventory">Inventering</option>
          <option value="correction">Korrigering</option>
        </select></label>
        <Link href={"/inventory/history" + (scope.size ? "?" + scope : "")}
          className="product-clear-filter">Rensa filter</Link>
      </form>
    </BottomSheet>}
  </>;
}
