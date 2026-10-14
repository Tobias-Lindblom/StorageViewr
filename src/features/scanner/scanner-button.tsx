"use client";

import { useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ScannerSheet } from "./scanner-sheet";

export function ScannerButton({ children, className, label = "Skanna lagerplats" }: {
  children: ReactNode; className?: string; label?: string;
}) {
  const pathname = usePathname();
  const [panel, setPanel] = useState({ pathname, open: false });
  const trigger = useRef<HTMLButtonElement>(null);
  // A browser navigation also dismisses the sheet and releases its camera.
  if (panel.pathname !== pathname) setPanel({ pathname, open: false });
  const open = panel.pathname === pathname && panel.open;
  function close() {
    setPanel({ pathname, open: false });
    requestAnimationFrame(() => trigger.current?.focus());
  }
  return <>
    <button type="button" ref={trigger} className={className} aria-label={label}
      aria-haspopup="dialog" aria-expanded={open} onClick={() => setPanel({ pathname, open: true })}>
      {children}
    </button>
    {open && <ScannerSheet onClose={close} onResolved={() => setPanel({ pathname, open: false })} />}
  </>;
}
