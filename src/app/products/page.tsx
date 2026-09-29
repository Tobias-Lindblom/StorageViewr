import Link from "next/link";
import { ProductPhoto } from "@/components/product-photo";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
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
  const statusLink = (status: "active" | "inactive" | "all") =>
    "/products?" +
    new URLSearchParams({
      q: query.q,
      status,
      page: "1",
    });
  return (
    <AppShell context={context}>
      <PageHeading
        title="Produkter"
        description="Artiklar och produktregister för företaget."
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
      <form action="/products" className="mb-4 flex items-end gap-2">
        <input type="hidden" name="status" defaultValue={query.status} />
        <label className="min-w-0 flex-1">
          Sök
          <input
            type="search"
            name="q"
            defaultValue={query.q}
            maxLength={100}
            placeholder="Namn, artikelnummer eller streckkod"
          />
        </label>
        <button className="button-secondary shrink-0 px-5!" type="submit">
          Sök
        </button>
      </form>

      {admin && (
        <nav
          aria-label="Filtrera produkter efter status"
          className="mb-5 grid grid-cols-3 rounded-xl border border-line bg-surface p-1"
        >
          {[
            ["active", "Aktiva"],
            ["inactive", "Inaktiva"],
            ["all", "Alla"],
          ].map(([status, label]) => (
            <Link
              key={status}
              href={statusLink(status as "active" | "inactive" | "all")}
              aria-current={query.status === status ? "page" : undefined}
              className={
                "flex min-h-10 items-center justify-center rounded-lg px-3 text-sm font-medium transition " +
                (query.status === status
                  ? "bg-violet-500/15 text-accent ring-1 ring-inset ring-violet-400/25"
                  : "text-muted hover:bg-surface-raised hover:text-foreground")
              }
            >
              {label}
            </Link>
          ))}
        </nav>
      )}

      <div className="mb-3 flex min-h-9 items-center justify-between gap-3">
        <p className="text-xs text-muted" role="status">
          {result.total} {result.total === 1 ? "produkt" : "produkter"}
        </p>
        {(query.q || query.status !== "active") && (
          <Link href="/products" className="text-sm text-cyan">
            Rensa filter
          </Link>
        )}
      </div>
      {result.items.length ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          {result.items.map((product) => (
            <Link
              key={product.id}
              href={"/products/" + product.id}
              className="group flex min-h-22 items-center gap-4 border-b border-line/60 p-4 transition last:border-0 hover:bg-surface-raised sm:px-5"
            >
              {product.photoUrl ? (
                <ProductPhoto src={product.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-line bg-canvas object-cover" />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-accent"><AppIcon name="product" /></span>
              )}
              <div className="min-w-0 flex-1">
                <p className="wrap-break-word font-semibold">{product.name}</p>
                <p className="mt-1 break-all text-xs text-muted">
                  {product.sku}
                  {!product.active && " · Inaktiv"}
                </p>
              </div>
              <MaterialArrow
                size={18}
                className="text-muted transition group-hover:translate-x-0.5 group-hover:text-accent"
              />
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="mb-2! text-lg!">
            {
            query.q || query.status !== "active"
              ? "Inga produkter matchar"
              : "Ditt produktregister börjar här"
            }
          </h2>
          <p className="max-w-lg text-sm leading-7 text-muted">
            {query.q || query.status !== "active"
              ? "Prova en annan sökning eller ändra statusfiltret."
              : admin
                ? "Lägg till din första produkt eller importera flera från en CSV-fil."
                : "Företaget har inga aktiva produkter ännu."}
          </p>
        </div>
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
