import { AppIcon } from "@/components/app-icon";

export function LocationStockSummary({ count, total }: { count: number; total: string }) {
  const productLabel = count === 1 ? "produkt" : "produkter";
  return <div className="location-summary">
    <dl><dt><span className="product-summary-icon"><AppIcon name="inventory" width={22} height={22} /></span>
      <span className="sr-only">{productLabel}</span></dt>
      <dd><strong>{count.toLocaleString("sv-SE")}</strong><span aria-hidden="true">{productLabel}</span></dd>
    </dl>
    <dl><dt><span className="product-summary-icon"><AppIcon name="product" width={24} height={24} /></span>
      <span className="sr-only">enheter totalt</span></dt>
      <dd><strong>{BigInt(total).toLocaleString("sv-SE")}</strong><span aria-hidden="true">enheter totalt</span></dd>
    </dl>
  </div>;
}
