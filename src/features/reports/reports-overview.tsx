import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import { EmptyState } from "@/components/empty-state";
import { DownloadInventoryReport } from "@/features/inventory/download-report";
import { DownloadLocationReport } from "@/features/locations/download-location-report";
import type { listInventories } from "@/features/inventory/session-queries";
import type { LocationStockReport } from "@/features/locations/report-data";
import { formatSek } from "@/lib/money";
import styles from "./reports.module.css";

type WarehouseOption = { id: string; name: string; active: boolean };

export function ReportsOverview({ warehouses, warehouseId, valuation, inventories }: {
  warehouses: WarehouseOption[];
  warehouseId?: string;
  valuation: LocationStockReport;
  inventories: Awaited<ReturnType<typeof listInventories>>;
}) {
  const reportQuery = warehouseId ? "&warehouseId=" + encodeURIComponent(warehouseId) : "";
  return <div className={styles.layout}>
    <section className={styles.valueCard} aria-labelledby="valuation-report-heading">
      <div className={styles.valueHeading}>
        <span className={styles.valueIcon}><AppIcon name="coins" width={24} height={24} /></span>
        <div><h2 id="valuation-report-heading">Lagervärdesrapport</h2><p>Aktuella saldon, styckvärden och totalt lagervärde.</p></div>
      </div>
      <div className={styles.valueSummary}>
        <div><span>Totalt lagervärde</span><strong>{formatSek(BigInt(valuation.summary.inventoryValueUnits))}</strong><small>{valuation.scopeName}</small></div>
        <dl>
          <div><dt>Produkter</dt><dd>{valuation.summary.uniqueProducts.toLocaleString("sv-SE")}</dd></div>
          <div><dt>Lagerplatser</dt><dd>{valuation.summary.locations.toLocaleString("sv-SE")}</dd></div>
          <div><dt>Saknar värde</dt><dd>{valuation.summary.productsWithoutValue.toLocaleString("sv-SE")}</dd></div>
        </dl>
      </div>
      <div className={styles.valueActions}>
        <form action="/reports" className={styles.scopeForm}>
          <label htmlFor="report-warehouse">Omfattning</label>
          <div><select id="report-warehouse" name="warehouseId" defaultValue={warehouseId ?? ""}>
            <option value="">Alla lager</option>
            {warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}{!warehouse.active && " (inaktivt)"}</option>)}
          </select><button type="submit">Visa</button></div>
        </form>
        <DownloadLocationReport warehouseId={warehouseId} className={styles.primaryDownload} />
      </div>
      {valuation.summary.productsWithoutValue > 0 && <p className={styles.valueNotice}>
        <AppIcon name="info" width={16} height={16} /> {valuation.summary.productsWithoutValue} {valuation.summary.productsWithoutValue === 1 ? "produkt saknar" : "produkter saknar"} styckvärde och räknas därför som 0 kr.
      </p>}
    </section>

    <section className={styles.inventorySection} aria-labelledby="inventory-reports-heading">
      <div className={styles.sectionHeading}>
        <div><h2 id="inventory-reports-heading">Inventeringsrapporter</h2><p>Färdiga underlag från genomförda inventeringar.</p></div>
        <Link href="/inventories/completed">Alla inventeringar</Link>
      </div>
      {inventories.items.length ? <ol className={styles.reportList}>
        {inventories.items.map(inventory => <li key={inventory.id}>
          <span className={styles.reportIcon}><AppIcon name="document" width={21} height={21} /></span>
          <div className={styles.reportIdentity}>
            <strong>{inventory.name}</strong>
            <span>{inventory.warehouseName}</span>
            <small>{inventory.counted} {inventory.counted === 1 ? "lagerplats" : "lagerplatser"} · Slutförd {inventory.completedAt ? new Date(inventory.completedAt).toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm", day: "numeric", month: "short", year: "numeric" }) : "–"}</small>
          </div>
          <div className={styles.reportActions}>
            <Link href={`/inventories/${inventory.id}`}>Visa</Link>
            <DownloadInventoryReport inventoryId={inventory.id} className={styles.reportDownload} />
          </div>
        </li>)}
      </ol> : <EmptyState icon="document" title="Inga inventeringsrapporter ännu">När en inventering slutförs visas rapporten här.</EmptyState>}
      {inventories.pages > 1 && <nav aria-label="Rapportsidor" className="product-pagination">
        {inventories.page > 1 ? <Link className="product-page-control product-page-prev" href={`/reports?page=${inventories.page - 1}${reportQuery}`}><AppIcon name="chevron" width={15} height={15} /> Föregående</Link> : <span />}
        <span className="product-page-position">Sida {inventories.page} av {inventories.pages}</span>
        {inventories.page < inventories.pages ? <Link className="product-page-control product-page-next" href={`/reports?page=${inventories.page + 1}${reportQuery}`}>Nästa <AppIcon name="chevron" width={15} height={15} /></Link> : <span />}
      </nav>}
    </section>
  </div>;
}
