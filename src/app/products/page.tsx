import Link from "next/link";
import { ProductFilters } from "@/features/products/product-filters";
import { ProductPhoto } from "@/components/product-photo";
import { AppShell } from "@/components/app-shell";
import { AppIcon } from "@/components/app-icon";
import { EmptyState } from "@/components/empty-state";
import { pageTenant } from "@/lib/server/page-auth";
import { getProductStockCounts, listProducts } from "@/features/products/service";
import { productQuerySchema } from "@/validation/product";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await pageTenant();
  const params = await searchParams;
  const parsed = productQuerySchema.safeParse({
    q: params.q, status: params.status, stock: params.stock, page: params.page,
  });
  const query = parsed.success ? parsed.data : productQuerySchema.parse({});
  const admin = context.role === "admin";
  if (!admin) query.status = "active";
  const [result, counts] = await Promise.all([
    listProducts(context, query), getProductStockCounts(context, query),
  ]);
  const pageLink = (page: number) => "/products?" + new URLSearchParams({
    q: query.q, status: query.status, stock: query.stock, page: String(page),
  });
  const stockLink = (stock: "all" | "in-stock" | "empty") => "/products?" + new URLSearchParams({
    q: query.q, status: query.status, stock, page: "1",
  });
  const filtered = Boolean(query.q || query.status !== "active" || query.stock !== "all");
  return (
    <AppShell context={context}>
      <section className="product-overview" aria-labelledby="products-heading">
        <h1 id="products-heading">Produkter</h1>
        <form action="/products" role="search" aria-label="Sök produkter" className="product-search">
          <input type="hidden" name="status" defaultValue={query.status} />
          <input type="hidden" name="stock" defaultValue={query.stock} />
          <div className="product-search-field">
            <button type="submit" aria-label="Sök produkter"><AppIcon name="search" width={18} height={18} /></button>
            <label htmlFor="product-search" className="sr-only">Sök produkt, SKU eller streckkod</label>
            <input id="product-search" type="search" name="q" defaultValue={query.q}
              maxLength={100} placeholder="Sök produkt, SKU eller streckkod..." />
          </div>
          <ProductFilters q={query.q} status={query.status} stock={query.stock} admin={admin} />
        </form>
        <nav aria-label="Filtrera produkter efter saldo" className="product-stock-chips">
          {[
            { stock: "all" as const, label: "Alla", count: counts.all },
            { stock: "in-stock" as const, label: "I lager", count: counts.inStock },
            { stock: "empty" as const, label: "Slut", count: counts.empty },
          ].map(item => (
            <Link key={item.stock} href={stockLink(item.stock)}
              aria-current={query.stock === item.stock ? "page" : undefined}
              className={"product-stock-chip" + (query.stock === item.stock ? " is-active" : "")}>
              {item.label} ({item.count.toLocaleString("sv-SE")})
            </Link>
          ))}
        </nav>
        <div className="product-list-toolbar">
          <p className="sr-only" role="status">{result.total} {result.total === 1 ? "produkt" : "produkter"}</p>
          {filtered && <Link href="/products" className="product-clear-filter">Rensa filter</Link>}
          {admin && <Link href="/products/new" className="product-create"><span aria-hidden="true">+</span> Ny produkt</Link>}
        </div>
        {result.items.length ? (
          <div className="product-list">
            {result.items.map(product => (
              <Link key={product.id} href={"/products/" + product.id} className="product-list-row">
                {product.photoUrl || product.imageUrl ? (
                  <ProductPhoto src={product.photoUrl || product.imageUrl} alt="" className="product-list-photo" />
                ) : (
                  <span className="product-list-photo product-photo-placeholder"><AppIcon name="product" width={28} height={28} /></span>
                )}
                <div className="product-list-identity">
                  <p className="product-list-name">{product.name}</p>
                  <p className="product-list-sku">SKU {product.sku}{!product.active && " · Inaktiv"}</p>
                </div>
                <div className="product-list-stock">
                  <p className={product.totalQuantity === "0" ? "is-empty" : ""}>
                    {BigInt(product.totalQuantity).toLocaleString("sv-SE")} st
                  </p>
                  <span>{product.locationCount} {product.locationCount === 1 ? "plats" : "platser"}</span>
                </div>
                <AppIcon name="chevron" width={15} height={15} className="product-row-arrow shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState icon="product" title={filtered ? "Inga produkter matchar" : "Ditt produktregister börjar här"}>
            {filtered ? "Prova en annan sökning eller ändra filtren." : admin
              ? "Lägg till din första produkt eller importera flera från filterpanelen."
              : "Företaget har inga aktiva produkter ännu."}
          </EmptyState>
        )}
        {result.pages > 1 && (
          <nav aria-label="Produktsidor" className="product-pagination">
            {result.page > 1 ? <Link href={pageLink(result.page - 1)} className="product-page-control product-page-prev" aria-label="Föregående produktsida">
              <AppIcon name="chevron" width={15} height={15} /> Föregående
            </Link> : <span />}
            <span className="product-page-position">Sida {result.page} av {result.pages}</span>
            {result.page < result.pages ? <Link href={pageLink(result.page + 1)} className="product-page-control product-page-next" aria-label="Nästa produktsida">
              Nästa <AppIcon name="chevron" width={15} height={15} />
            </Link> : <span />}
          </nav>
        )}
      </section>
    </AppShell>
  );
}
