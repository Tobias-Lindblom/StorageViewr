"use client";
import Link from "next/link";
import { useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { AppIcon } from "@/components/app-icon";

export function ProductFilters({ q, status, stock, admin }: {
  q: string; status: string; stock: string; admin: boolean;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="product-filter-trigger" onClick={() => setOpen(true)} aria-haspopup="dialog"
      aria-label={stock !== "all" || status !== "active" ? "Filter, aktiva filter" : "Filter"}>
      <AppIcon name="filter" width={20} height={20} />
      {(stock !== "all" || status !== "active") && <span aria-hidden="true" className="product-filter-dot" />}
    </button>
    {open && <BottomSheet title="Filtrera produkter" onClose={() => setOpen(false)}
      footer={<button type="submit" form="product-filter-form" className="button w-full">Tillämpa filter</button>}>
      <form id="product-filter-form" action="/products" className="space-y-5">
        <input type="hidden" name="q" value={q} />
        <label>Lagersaldo<select name="stock" defaultValue={stock}>
          <option value="all">Alla saldon</option><option value="in-stock">I lager</option>
          <option value="empty">Slut (saldo 0)</option><option value="unplaced">Utan lagerplats</option>
        </select></label>
        {admin ? <label>Produktstatus<select name="status" defaultValue={status}>
          <option value="active">Aktiva</option><option value="inactive">Inaktiva</option><option value="all">Alla</option>
        </select></label> : <input type="hidden" name="status" value="active" />}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/products" className="inline-flex min-h-11 items-center text-sm text-accent">Rensa filter</Link>
          {admin && <Link href="/products/import" className="inline-flex min-h-11 items-center gap-2 text-sm text-accent"><AppIcon name="download" />Importera CSV</Link>}
        </div>
      </form>
    </BottomSheet>}
  </>;
}
