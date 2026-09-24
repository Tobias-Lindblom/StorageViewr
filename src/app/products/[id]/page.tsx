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

      <section className="panel" aria-labelledby="product-details-heading">
        <div className={photo ? "grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,240px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]" : ""}>
          <div className="min-w-0">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h1 id="product-details-heading" className="mb-0! min-w-0 text-xl! font-semibold sm:text-2xl!">{product.name}</h1>
              <span className={"rounded-full border px-3 py-1 text-xs font-medium " + (product.active ? "border-cyan/20 bg-cyan/5 text-cyan" : "border-line bg-canvas text-muted")}>
                {product.active ? "Aktiv" : "Inaktiv"}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-6">
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
          </div>
          {photo && (
            <div className="flex items-center justify-center overflow-hidden rounded-xl border border-line/60 bg-canvas p-2">
              <ProductPhoto
                src={photo}
                alt={"Produktbild: " + product.name}
                eager
                className="max-h-64 w-full object-contain sm:max-h-80"
              />
            </div>
          )}
        </div>
        {context.role === "admin" && (
          <div className="mt-6 flex justify-end border-t border-line/60 pt-5">
            <Link className="button-secondary w-full sm:w-auto" href={"/products/" + id + "/edit"}>
              Redigera produkt
            </Link>
          </div>
        )}
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
