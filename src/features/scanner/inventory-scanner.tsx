"use client";
import type { InventoryDetail } from "@/features/inventory/session-queries";
import { QrScanner } from "./qr-scanner";

type Resolved = { inventory: InventoryDetail; locationId: string };
export function InventoryScanner({ inventoryId, locationId, locationCode, onResolved }: {
  inventoryId: string; locationId: string; locationCode: string; onResolved: (result: Resolved) => void;
}) {
  return <QrScanner locationCode={locationCode}
    description={"Rikta kameran mot QR-etiketten på " + locationCode + ". Räkningen öppnas när rätt kod har lästs."}
    resolveCode={async (input, signal) => {
      const response = await fetch("/api/inventory/sessions/" + inventoryId + "/scan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, locationId }), signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.details?.[0]?.message ?? result.error?.message ?? "Platsen kunde inte öppnas.");
      if (!signal.aborted) onResolved(result.data);
    }} />;
}
