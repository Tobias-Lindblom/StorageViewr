import Link from "next/link";
import { ProductPhoto } from "@/components/product-photo";
import { AppShell } from "@/components/app-shell";

import { MaterialArrow } from "@/components/material-arrow";
import { StockPanel } from "@/features/inventory/stock-panel";
import { getProduct } from "@/features/products/service";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await pageTenant();
  const { id } = await params;
  const product = await pageResource(() => getProduct(context, id));
  const photo = product.photoUrl || product.imageUrl;

  return (
    <AppShell context={context}>
      <Link
        href="/products"
        className="mb-4 inline-flex min-h-13 items-center gap-2 text-sm text-accent"
      >
        <MaterialArrow name="back" />
        Alla produkter
      </Link>

      <header className="mb-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 id="product-details-heading" className="mb-0! text-3xl! font-bold sm:text-4xl!">
              {product.name}
            </h1>
            <p className="mt-2 break-all text-sm text-muted">{product.sku}</p>
          </div>
          <span
            className={
              "inline-flex shrink-0 items-center gap-2 pt-2 text-xs " +
              (product.active ? "text-cyan" : "text-muted")
            }
          >
            <span
              aria-hidden="true"
              className={
                "h-1.5 w-1.5 rounded-full " +
                (product.active ? "bg-cyan" : "bg-muted")
              }
            />
            {product.active ? "Aktiv" : "Inaktiv"}
          </span>
        </div>

        {context.role === "admin" && (
          <div className="mt-5">
            <Link
              className="button-secondary w-full sm:w-auto"
              href={"/products/" + id + "/edit"}
            >
              Redigera produkt
            </Link>
          </div>
        )}
      </header>

      <section aria-label="Produktuppgifter">
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className={photo ? "grid sm:grid-cols-[minmax(0,1fr)_220px]" : ""}>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-6 p-5 sm:p-6">
              <div className="min-w-0">
                <dt className="text-xs text-muted">Artikelnummer</dt>
                <dd className="mt-2 break-all text-sm font-medium">{product.sku}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-muted">Streckkod</dt>
                <dd className="mt-2 break-all text-sm">
                  {product.barcode || "Ej angiven"}
                </dd>
              </div>
              {product.description && (
                <div className="col-span-2 min-w-0">
                  <dt className="text-xs text-muted">Beskrivning</dt>
                  <dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">
                    {product.description}
                  </dd>
                </div>
              )}
            </dl>
            {photo && (
              <div className="border-t border-line/60 p-5 sm:border-t-0 sm:border-l sm:p-4">
                <p className="mb-3 text-xs text-muted">Produktbild</p>
                <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-xl bg-canvas p-2">
                  <ProductPhoto
                    src={photo}
                    alt={"Produktbild: " + product.name}
                    eager
                    className="max-h-48 w-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <StockPanel
        context={context}
        kind="product"
        id={id}
        label={product.name + " · " + product.sku}
        active={product.active}
      />
    </AppShell>
  );
}
