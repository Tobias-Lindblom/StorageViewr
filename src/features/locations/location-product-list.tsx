import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import { ProductPhoto } from "@/components/product-photo";
import type { StockData } from "@/features/inventory/service";

export function LocationProductList({ items }: { items: StockData["items"] }) {
  return <ul className="location-product-list">
    {items.map(row => <li key={row.id}>
      <Link href={"/products/" + row.productId} className="location-product-row">
        {row.photoUrl ? <ProductPhoto src={row.photoUrl} alt="" className="location-product-photo" /> :
          <span className="location-product-photo product-photo-placeholder"><AppIcon name="product" width={23} height={23} /></span>}
        <span className="location-product-identity">
          <span>{row.productName}</span><span>SKU {row.sku}{!row.active && " · Inaktiv"}</span>
        </span>
        <strong className={"location-product-quantity" + (row.quantity === 0 ? " is-empty" : "")}>{row.quantity.toLocaleString("sv-SE")} st</strong>
        <AppIcon name="chevron" width={14} height={14} className="shrink-0 text-muted" />
      </Link>
    </li>)}
  </ul>;
}
