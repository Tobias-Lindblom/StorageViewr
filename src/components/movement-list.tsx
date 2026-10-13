import Link from "next/link";
import type { MovementData } from "@/features/inventory/service";

export function movementLabel(type: string) {
  const labels: Record<string, string> = {
    INITIAL: "Första placering", ADJUSTMENT: "Saldoändring", RECEIPT: "Inleverans",
    ISSUE: "Uttag", TRANSFER_OUT: "Flytt från plats", TRANSFER_IN: "Flytt till plats",
    CORRECTION: "Korrigering", INVENTORY: "Inventering",
  };
  return labels[type] ?? "Saldoändring";
}

export function MovementList({ items, href, title = "Senaste händelser" }: {
  items: MovementData["items"]; href: string; title?: string;
}) {
  return <section className="mt-7">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="mb-0! text-lg!">{title}</h2>
      <Link href={href} className="inline-flex min-h-11 items-center text-sm text-accent">Visa full historik</Link>
    </div>
    {items.length ? <ol className="divide-y divide-line/60 overflow-hidden rounded-2xl border border-line bg-surface">
      {items.map(item => <li key={item.id} className="flex items-start gap-3 p-4">
        <span className={"min-w-10 shrink-0 text-sm font-semibold tabular-nums " +
          (item.type.startsWith("TRANSFER") ? "text-accent" : item.difference < 0 ? "text-destructive" : "text-success")}>
          {item.difference > 0 ? "+" : ""}{item.difference.toLocaleString("sv-SE")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{movementLabel(item.type)}</p>
          <p className="mt-1 wrap-break-word text-xs text-muted">{item.productName} · {item.warehouseName} · {item.locationCode}</p>
          <time dateTime={item.createdAt} className="mt-1 block text-xs text-muted">
            {new Date(item.createdAt).toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", dateStyle: "short", timeStyle: "short" })}
          </time>
        </div>
      </li>)}
    </ol> : <p className="stock-card text-sm text-muted">Inga lagerhändelser registrerade.</p>}
  </section>;
}
