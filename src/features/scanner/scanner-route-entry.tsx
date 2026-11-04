"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const ScannerSheet = dynamic(
  () => import("./scanner-sheet").then(module => module.ScannerSheet),
  { loading: () => <p className="p-4 text-sm text-muted" role="status">Startar skannern…</p> },
);

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
