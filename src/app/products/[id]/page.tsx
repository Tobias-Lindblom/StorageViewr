import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { MaterialArrow } from "@/components/material-arrow";
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
  return (
    <AppShell context={context}>
      <Link
        href="/products"
        className="mb-4 inline-flex min-h-13 items-center gap-2 text-sm text-accent"
      >
        <MaterialArrow name="back" />
        Alla produkter
      </Link>
      <PageHeading
        title={product.name}
        action={
          context.role === "admin" ? (
            <Link
              className="button-secondary"
              href={"/products/" + id + "/edit"}
            >
              Redigera produkt
            </Link>
          ) : undefined
        }
      />
      <section className="panel max-w-2xl">
        <h2>Produktuppgifter</h2>
        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted">Artikelnummer</dt>
            <dd className="mt-2 break-all font-medium">{product.sku}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Status</dt>
            <dd className="mt-2">{product.active ? "Aktiv" : "Inaktiv"}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Streckkod</dt>
            <dd className="mt-2 break-all">
              {product.barcode || "Ingen streckkod angiven."}
            </dd>
          </div>
          {product.imageUrl && (
            <div>
              <dt className="text-sm text-muted">Produktbild</dt>
              <dd className="mt-2">
                <a
                  href={product.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-13 items-center gap-2 text-sm text-accent"
                >
                  Öppna bild
                  <MaterialArrow name="outward" />
                </a>
              </dd>
            </div>
          )}
          {product.description && (
            <div className="sm:col-span-2">
              <dt className="text-sm text-muted">Beskrivning</dt>
              <dd className="mt-2 whitespace-pre-wrap wrap-break-word text-sm leading-7">
                {product.description}
              </dd>
            </div>
          )}
        </dl>
      </section>
    </AppShell>
  );
}
