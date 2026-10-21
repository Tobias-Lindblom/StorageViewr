"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import type { getProduct } from "./service";

export function ProductDetailsMenu({ product, admin }: {
  product: Awaited<ReturnType<typeof getProduct>>; admin: boolean;
}) {
  const [open, setOpen] = useState(false);
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
  if (!admin) return null;

  return (
    <div className="product-details-menu" ref={container} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button type="button" className="product-more-trigger" aria-label="Fler produktalternativ"
        aria-expanded={open} aria-controls={menuId} ref={trigger} onClick={() => setOpen(value => !value)}>
        <AppIcon name="more" width={22} height={22} strokeWidth={3} />
      </button>
      <div id={menuId} className="product-more-panel" hidden={!open}>
        <Link href={"/products/" + product.id + "/edit"} onClick={() => setOpen(false)}>
          <AppIcon name="edit" width={18} height={18} />Redigera produkt
        </Link>
      </div>
    </div>
  );
}
