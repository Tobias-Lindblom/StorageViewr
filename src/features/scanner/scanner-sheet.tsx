"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { LocationScanner } from "./location-scanner";

export function ScannerSheet({ onClose, onResolved }: {
  onClose: () => void;
  onResolved: () => void;
}) {
  const [active, setActive] = useState(true);
  return <BottomSheet title="Skanna lagerplats" variant="scanner"
    subtitle="Rikta kameran mot en QR-etikett för att öppna rätt lagerplats." onClose={onClose} onClosing={() => setActive(false)}>
    <LocationScanner active={active} onResolved={onResolved} />
  </BottomSheet>;
}
