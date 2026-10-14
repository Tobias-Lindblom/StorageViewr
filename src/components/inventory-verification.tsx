import Link from "next/link";
import type { VerificationData } from "@/features/inventory/verification";
import { AppIcon } from "./app-icon";
import { StatusBadge } from "./status-badge";

export const verificationLabels = { never: "Ej inventerad", partial: "Behöver räknas", changed: "Saldo ändrat",
    old: "Behöver verifieras", verified: "Verifierad" };

export function InventoryVerification({ data }: { data: VerificationData }) {
  const labels = verificationLabels;
  return <section aria-label="Inventeringsstatus" className="stock-card mt-3 gap-1! p-3! sm:p-5!">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="inline-flex items-center gap-2 text-sm"><AppIcon name="inventory" width={17} height={17} className="text-accent" />Senast inventerad</span>
      <StatusBadge tone={data.state === "verified" ? "success" : data.state === "never" ? "neutral" : "warning"}>{labels[data.state]}</StatusBadge>
    </div>
    {data.countedAt ? <div className="flex flex-wrap items-center justify-between gap-x-3">
      <time dateTime={data.countedAt} className="text-xs font-medium">
        {new Date(data.countedAt).toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", dateStyle: "medium", timeStyle: "short" })}
      </time>
      {data.sessionId && <Link href={"/inventories/" + data.sessionId} className="inline-flex min-h-11 items-center text-xs text-accent">Visa inventering</Link>}
    </div> : <p className="py-1 text-xs text-muted">Ingen avslutad fysisk inventering.</p>}
    <p className="text-xs leading-5 text-muted">
      {data.state === "partial" ? "Alla aktuella placeringar är ännu inte fysiskt kontrollerade." :
        data.state === "changed" ? "Saldot har ändrats efter räkningen. Behöver räknas igen." :
        data.state === "old" ? "Minst 30 dagar sedan den fysiska kontrollen." :
        data.productScope ? data.checked + " av " + data.total + " platser räknade. Äldsta kontrollen visas." :
        data.countedAt ? data.checked + " produkter räknade. " + (data.corrections ? data.corrections + " avvikelser korrigerades." : "Ingen avvikelse.") :
        "Inventera platsen för att kontrollera lagret."}
    </p>
  </section>;
}
