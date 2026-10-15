import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AppIcon } from "@/components/app-icon";
import { MaterialArrow } from "@/components/material-arrow";
import { EmptyState } from "@/components/empty-state";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";
import { listHistory } from "@/features/inventory/history-service";
import { HistoryList } from "@/features/inventory/history-list";
import { HistoryFilters } from "@/features/inventory/history-filters";
import { historyQuerySchema } from "@/validation/inventory";

export default async function StockHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await pageTenant();
  if (context.role !== "admin") notFound();
  const parsed = historyQuerySchema.safeParse(await searchParams);
  if (!parsed.success) notFound();
  const query = parsed.data;
  const result = await pageResource(() => listHistory(context, query));
  const scope: Record<string, string> = query.productId ? { productId: query.productId } :
    query.locationId ? { locationId: query.locationId } : {};
  const link = (kind = query.kind, page = 1, q = query.q) =>
    "/inventory/history?" + new URLSearchParams({ ...scope, q, kind, page: String(page) });
  const back = query.productId ? "/products/" + query.productId :
    query.locationId ? "/locations/" + query.locationId : null;
  const filtered = query.q !== "" || query.kind !== "all";
  return (
    <AppShell context={context}>
      <section className="product-overview history-overview" aria-labelledby="history-heading">
        {back && <Link href={back} className="history-scope-back">
          <MaterialArrow name="back" size={17} />{query.productId ? "Till produkten" : "Till lagerplatsen"}
        </Link>}
        <h1 id="history-heading">Historik</h1>
        <form action="/inventory/history" role="search" aria-label="Sök historik" className="product-search">
          <input type="hidden" name="kind" value={query.kind} />
          {query.productId && <input type="hidden" name="productId" value={query.productId} />}
          {query.locationId && <input type="hidden" name="locationId" value={query.locationId} />}
          <div className="product-search-field">
            <button type="submit" aria-label="Sök historik"><AppIcon name="search" width={18} height={18} /></button>
            <label className="sr-only" htmlFor="history-search">Sök produkt, SKU, lagerplats eller händelse</label>
            <input id="history-search" name="q" type="search" defaultValue={query.q} maxLength={100} placeholder="Sök..." />
          </div>
          <HistoryFilters {...query} />
        </form>
        <nav className="history-chips" aria-label="Filtrera historik efter händelse">
          {([
            ["all", "Alla"], ["receipt", "Inleverans"], ["issue", "Uttag"],
            ["transfer", "Flytt"], ["inventory", "Inventering"],
          ] as const).map(([kind, title]) => <Link key={kind} href={link(kind)}
            aria-current={query.kind === kind ? "page" : undefined}
            className={"product-stock-chip" + (query.kind === kind ? " is-active" : "")}>{title}</Link>)}
        </nav>
        <p className="sr-only" role="status">{result.total} {result.total === 1 ? "händelse" : "händelser"}</p>
        {query.kind === "correction" && <p className="history-active-filter">Korrigeringar
          <Link href={link("all")}>Visa alla</Link></p>}
        {result.items.length ? <HistoryList items={result.items} /> : <EmptyState icon="history"
          title={filtered ? "Inga händelser matchar" : "Ingen historik ännu"}
          action={filtered && <Link href={link("all", 1, "")} className="button-secondary">Rensa filter</Link>}>
          {filtered ? "Prova en annan sökning eller ändra filtren." : "Inleveranser, uttag, flyttar och slutförda inventeringar visas här."}
        </EmptyState>}
        {result.pages > 1 && <nav aria-label="Historiksidor" className="product-pagination">
          {result.page > 1 ? <Link href={link(query.kind, result.page - 1)} className="product-page-control product-page-prev">
            <AppIcon name="chevron" width={15} height={15} /> Föregående
          </Link> : <span />}
          <span className="product-page-position">Sida {result.page} av {result.pages}</span>
          {result.page < result.pages ? <Link href={link(query.kind, result.page + 1)} className="product-page-control product-page-next">
            Nästa <AppIcon name="chevron" width={15} height={15} />
          </Link> : <span />}
        </nav>}
      </section>
    </AppShell>
  );
}
