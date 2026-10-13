import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import type { StockData } from "@/features/inventory/service";

export function ProductPlacementList({ items }: { items: StockData["items"] }) {
  return <ul className="product-placement-list">
    {items.map(row => <li key={row.id}>
      <Link href={"/locations/" + row.locationId} className="product-placement-row">
        <span className="product-location-marker"><AppIcon name="location" width={28} height={28} fill="currentColor" strokeWidth={0} fillRule="evenodd" /></span>
        <div className="product-placement-identity">
          <p>{row.locationCode}</p>
          <span>{row.warehouseName}{!row.active && " · Inaktiv"}</span>
        </div>
        <strong className={row.quantity === 0 ? "is-empty" : ""}>{row.quantity.toLocaleString("sv-SE")} st</strong>
        <AppIcon name="chevron" width={15} height={15} className="shrink-0 text-muted" />
      </Link>
    </li>)}
  </ul>;
}
