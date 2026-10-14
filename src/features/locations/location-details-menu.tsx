"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { BottomSheet } from "@/components/bottom-sheet";
import { DeleteLocation } from "./delete-location";
import type { getLocation } from "./service";

export function LocationDetailsMenu({ location, qr, admin }: {
  location: Awaited<ReturnType<typeof getLocation>>; qr: { image: string } | null; admin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
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
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <>
    <div className="product-details-menu" ref={container} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button type="button" className="product-more-trigger location-more-trigger" ref={trigger}
        aria-label="Fler platsalternativ" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
        <AppIcon name="more" width={22} height={22} strokeWidth={3} />
      </button>
      <div id={id} className="product-more-panel location-more-panel" hidden={!open}>
        <button type="button" aria-haspopup="dialog" onClick={() => { setOpen(false); setDetails(true); }}>
          <AppIcon name="qr" width={18} height={18} />QR-kod och platsuppgifter
        </button>
        {admin && <DeleteLocation locationId={location.id} code={location.code} compact
          onOpen={() => setOpen(false)} onClose={() => trigger.current?.focus()} />}
      </div>
    </div>
    {details && <BottomSheet title="QR-kod och platsuppgifter" onClose={() => { setDetails(false); trigger.current?.focus(); }}>
      <p className="mb-4 wrap-break-word text-sm">{location.warehouseName} · {location.code}</p>
      {qr ? <div className="flex flex-col items-center gap-4">
        <Image src={qr.image} alt={"QR-kod för " + location.code} width={160} height={160}
          unoptimized className="h-auto w-40 max-w-full rounded-lg bg-white" />
        <p className="text-sm leading-6 text-muted">Skanna etiketten för att öppna platsen eller fortsätta en pågående inventering.</p>
      </div> : <p className="text-sm text-muted">Platsen är inaktiv.</p>}
    </BottomSheet>}
  </>;
}
