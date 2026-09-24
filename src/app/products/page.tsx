import Link from "next/link";
import { ProductPhoto } from "@/components/product-photo";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/empty-state";
import { AppIcon } from "@/components/app-icon";
import { MaterialArrow } from "@/components/material-arrow";
import { pageTenant } from "@/lib/server/page-auth";
import { listProducts } from "@/features/products/service";
import { productQuerySchema } from "@/validation/product";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await pageTenant();
  const params = await searchParams;
  const parsed = productQuerySchema.safeParse({
    q: params.q,
    status: params.status,
    page: params.page,
  });
  const query = parsed.success ? parsed.data : productQuerySchema.parse({});
  const admin = context.role === "admin";
  if (!admin) query.status = "active";
  const result = await listProducts(context, query);
  const pageLink = (page: number) =>
    "/products?" +
    new URLSearchParams({
      q: query.q,
      status: query.status,
      page: String(page),
    });
  return (
    <AppShell context={context}>
      <PageHeading
        title="Produkter"
        description="Företagets artiklar, samlade på ett ställe."
        action={
          admin ? (
            <div className="flex gap-2">
              <Link
                href="/products/new"
                className="button flex-1 whitespace-nowrap px-4!"
              >
                + Ny produkt
              </Link>
              <Link
                href="/products/import"
                className="button-secondary flex-1 whitespace-nowrap px-4!"
              >
                Importera CSV
              </Link>
            </div>
          ) : undefined
        }
      />
      <form action="/products" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="min-w-0 basis-full sm:basis-auto sm:flex-1">
          Sök produkt
          <input
            type="search"
            name="q"
            defaultValue={query.q}
            maxLength={100}
            placeholder="Namn, artikelnummer eller streckkod"
          />
        </label>
        {admin && (
          <label className="min-w-0 flex-1 sm:flex-none">
            Status
            <select name="status" defaultValue={query.status}>
              <option value="active">Aktiva</option>
              <option value="inactive">Inaktiva</option>
              <option value="all">Alla</option>
            </select>
          </label>
        )}
        <button className="button-secondary" type="submit">
          Sök
        </button>
        {(query.q || query.status !== "active") && (
          <Link
            href="/products"
            className="flex min-h-13 items-center px-2 text-sm text-accent"
          >
            Rensa
          </Link>
        )}
      </form>
      <p className="mb-3 text-xs text-muted" role="status">
        {result.total} {result.total === 1 ? "produkt" : "produkter"}
      </p>
      {result.items.length ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          {result.items.map((product) => (
            <Link
              key={product.id}
              href={"/products/" + product.id}
              className="flex min-h-24 items-center gap-4 border-b border-line/60 p-4 transition last:border-0 hover:bg-surface-raised sm:p-5"
            >
              {product.photoUrl ? (
                <ProductPhoto src={product.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-line bg-canvas object-cover" />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-accent"><AppIcon name="product" /></span>
              )}
              <div className="min-w-0 flex-1">
                <p className="wrap-break-word font-semibold">{product.name}</p>
                <p className="mt-1 break-all text-xs text-muted">
                  {product.sku}
                </p>
                {!product.active && (
                  <p className="mt-1 text-xs text-muted">Inaktiv</p>
                )}
              </div>
              <MaterialArrow className="text-accent" />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            query.q || query.status !== "active"
              ? "Inga produkter matchar"
              : "Ditt produktregister börjar här"
          }
        >
          {query.q || query.status !== "active"
            ? "Prova en annan sökning eller ändra statusfiltret."
            : admin
              ? "Lägg till din första produkt eller importera flera från en CSV-fil."
              : "Företaget har inga aktiva produkter ännu."}
        </EmptyState>
      )}
      {result.pages > 1 && (
        <nav
          aria-label="Produktsidor"
          className="mt-6 flex flex-wrap items-center justify-between gap-3"
        >
          {result.page > 1 ? (
            <Link
              href={pageLink(result.page - 1)}
              className="button-secondary gap-2"
            >
              <MaterialArrow name="back" />
              Föregående
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted">
            Sida {result.page} av {result.pages}
          </span>
          {result.page < result.pages ? (
            <Link
              href={pageLink(result.page + 1)}
              className="button-secondary gap-2"
            >
              Nästa
              <MaterialArrow />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </AppShell>
  );
}
