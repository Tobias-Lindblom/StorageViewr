"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { BottomSheet } from "@/components/bottom-sheet";
import type { getProduct } from "./service";

export function ProductDetailsMenu({ product, admin }: {
  product: Awaited<ReturnType<typeof getProduct>>; admin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <>
    <div className="product-details-menu" ref={container} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button type="button" className="product-more-trigger" aria-label="Fler produktalternativ"
        aria-expanded={open} aria-controls={menuId} ref={trigger} onClick={() => setOpen(value => !value)}>
        <AppIcon name="more" width={22} height={22} strokeWidth={3} />
      </button>
      <div id={menuId} className="product-more-panel" hidden={!open}>
        <button type="button" aria-haspopup="dialog" onClick={() => { setOpen(false); setDetails(true); }}>
          <AppIcon name="product" width={18} height={18} />Produktuppgifter
        </button>
        {admin && <Link href={"/products/" + product.id + "/edit"} onClick={() => setOpen(false)}>
          <AppIcon name="edit" width={18} height={18} />Redigera produkt
        </Link>}
      </div>
    </div>
    {details && <BottomSheet title="Produktuppgifter" onClose={() => {
      setDetails(false); trigger.current?.focus();
    }}>
      <dl className="space-y-4 text-sm">
        <div><dt className="text-xs text-muted">Produkt</dt><dd className="mt-1 wrap-break-word">{product.name}</dd></div>
        <div><dt className="text-xs text-muted">SKU</dt><dd className="mt-1 break-all">{product.sku}</dd></div>
        {product.barcode && <div><dt className="text-xs text-muted">Streckkod</dt><dd className="mt-1 break-all">{product.barcode}</dd></div>}
        <div><dt className="text-xs text-muted">Beskrivning</dt><dd className="mt-1 whitespace-pre-wrap wrap-break-word leading-6">{product.description || "Ingen beskrivning angiven."}</dd></div>
      </dl>
    </BottomSheet>}
  </>;
}
