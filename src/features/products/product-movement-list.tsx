import Link from "next/link";
import type { MovementData } from "@/features/inventory/service";
import { movementPreview } from "@/features/inventory/movement-preview";
import { movementLabel } from "@/features/inventory/movement-label";

export function ProductMovementList({ items, href }: { items: MovementData["items"]; href: string }) {
  const rows = movementPreview(items).slice(0, 4);
  return <section className="product-recent-movements" aria-labelledby="product-movements-heading">
    <div className="product-section-heading">
      <h2 id="product-movements-heading">Senaste händelser</h2><Link href={href}>Visa alla</Link>
    </div>
    {rows.length ? <ol className="product-movement-list">
      {rows.map(item => {
        const transfer = item.type.startsWith("TRANSFER");
        const label = item.type === "TRANSFER" ? "Flytt" : movementLabel(item.type);
        const amount = (!transfer && item.difference > 0 ? "+" : "") + item.difference.toLocaleString("sv-SE");
        const date = new Date(item.createdAt);
        const time = date.toLocaleDateString("sv-SE", { day: "numeric", month: "short", timeZone: "Europe/Stockholm" }).replace(/\./g, "") +
          ", " + date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" });
        return <li key={item.id}>
          <Link href={href} className="product-movement-row" aria-label={amount + ", " + label + ", " + item.locationCode + ", " + time}>
            <strong className={"product-movement-amount " + (transfer ? "text-accent" : item.difference < 0 ? "text-destructive" : "text-success")} title={amount}>{amount}</strong>
            <span className="product-movement-label" title={label}>{label}</span>
            <span className="product-movement-location" title={item.warehouseName + " · " + item.locationCode}>{item.locationCode}</span>
            <time dateTime={item.createdAt}>{time}</time>
          </Link>
        </li>;
      })}
    </ol> : <p className="product-movements-empty">Inga lagerhändelser registrerade.</p>}
  </section>;
}
