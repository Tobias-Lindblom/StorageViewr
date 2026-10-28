import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import { formatSek } from "@/lib/money";
import type { InventoryDetail } from "./session-queries";
import { DownloadInventoryReport } from "./download-report";

export function BaselineSummary({ data }: { data: InventoryDetail }) {
  const summary = data.baselineSummary;
  if (!summary) return null;
  return (
    <section className="baseline-summary" aria-labelledby="baseline-summary-heading">
      <header>
        <span><AppIcon name="verified" width={27} height={27} /></span>
        <div>
          <h2 id="baseline-summary-heading">Baseline etablerad</h2>
          <p>Det fysiska lagret i {data.warehouseName} är nu inventerat och verifierat.</p>
        </div>
      </header>
      <dl className="baseline-summary-metrics">
        <div><dt>Produkter</dt><dd>{summary.products.toLocaleString("sv-SE")}</dd></div>
        <div><dt>Lagerpositioner</dt><dd>{summary.positions.toLocaleString("sv-SE")}</dd></div>
        <div><dt>Enheter räknade</dt><dd>{BigInt(summary.countedUnits).toLocaleString("sv-SE")}</dd></div>
        <div><dt>Verifierade positioner</dt><dd>{summary.positions.toLocaleString("sv-SE")}</dd></div>
      </dl>
      <div className="baseline-summary-value">
        <span>Lagervärde</span>
        <strong>{formatSek(BigInt(summary.inventoryValueUnits))}</strong>
        {summary.productsWithoutValue > 0 && (
          <small>{summary.productsWithoutValue.toLocaleString("sv-SE")} {summary.productsWithoutValue === 1 ? "produkt saknar" : "produkter saknar"} styckvärde. Totalsumman är därför ofullständig.</small>
        )}
      </div>
      {summary.openDiscrepancies > 0 && (
        <p className="baseline-summary-warning">
          <AppIcon name="alert" width={17} height={17} />
          {summary.openDiscrepancies.toLocaleString("sv-SE")} öppna {summary.openDiscrepancies === 1 ? "avvikelse behöver" : "avvikelser behöver"} granskas.
        </p>
      )}
      <div className="baseline-summary-actions">
        <Link href="/dashboard" className="button">Till dashboard</Link>
        <DownloadInventoryReport inventoryId={data.id} className="button-secondary" />
        <Link href={"/reports?warehouseId=" + encodeURIComponent(data.warehouseId)} className="button-secondary">Visa lagervärdesrapport</Link>
        {summary.openDiscrepancies > 0 && <Link href="/discrepancies" className="button-secondary">Hantera avvikelser</Link>}
      </div>
    </section>
  );
}
