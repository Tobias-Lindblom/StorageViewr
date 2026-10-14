"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScannerSheet } from "./scanner-sheet";

// Compatibility for bookmarked /scanner links.
export function ScannerRouteEntry() {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  return open ? <ScannerSheet onResolved={() => setOpen(false)} onClose={() => {
    setOpen(false);
    router.replace("/dashboard", { scroll: false });
    requestAnimationFrame(() => Array.from(document.querySelectorAll<HTMLButtonElement>('button[aria-label="Skanna lagerplats"]'))
      .find(button => button.getClientRects().length > 0)?.focus());
  }} /> : null;
}
