"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { WarehouseEditorSheet } from "./warehouse-editor-sheet";
import type { getWarehouse } from "./service";

export function WarehouseCardMenu({ warehouse }: {
  warehouse: Awaited<ReturnType<typeof getWarehouse>>;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
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
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return <div className="product-details-menu warehouse-card-menu" ref={container} data-open={open}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button type="button" ref={trigger} className="warehouse-more-trigger"
      aria-label={"Fler alternativ för " + warehouse.name} aria-expanded={open} aria-controls={id}
      onClick={() => setOpen(value => !value)}>
      <AppIcon name="more" width={22} height={22} strokeWidth={3} />
    </button>
    <div id={id} className="product-more-panel warehouse-more-panel" hidden={!open}>
      <WarehouseEditorSheet initial={warehouse}
        label={<><AppIcon name="edit" width={18} height={18} />Redigera lager</>}
        onOpen={() => setOpen(false)} onClose={() => trigger.current?.focus()} />
    </div>
  </div>;
}
