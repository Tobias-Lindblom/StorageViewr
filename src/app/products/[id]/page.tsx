import Link from "next/link";
import { ProductPhoto } from "@/components/product-photo";
import { AppShell } from "@/components/app-shell";
import { AppIcon } from "@/components/app-icon";
import { StockPanel } from "@/features/inventory/stock-panel";
import { ProductDetailsMenu } from "@/features/products/product-details-menu";
import { getProduct } from "@/features/products/service";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await pageTenant();
  const { id } = await params;
  const product = await pageResource(() => getProduct(context, id));
  const photo = product.photoUrl || product.imageUrl;
  return <AppShell context={context} mobileDetail>
    <article className="product-detail" aria-labelledby="product-heading">
      <div className="product-detail-toolbar">
        <Link href="/products" className="product-back"><AppIcon name="chevron" width={16} height={16} />Tillbaka</Link>
        <ProductDetailsMenu product={product} admin={context.role === "admin"} />
      </div>
      <StockPanel context={context} kind="product" id={id}
        label={product.name + " · " + product.sku} active={product.active}
        productHeader={count => <header className="product-detail-header">
          {photo ? <ProductPhoto src={photo} alt={"Produktbild: " + product.name} eager className="product-detail-photo" /> :
            <span className="product-detail-photo product-photo-placeholder"><AppIcon name="product" width={32} height={32} /></span>}
          <div className="product-detail-identity">
            <h1 id="product-heading">{product.name}</h1>
            <p>SKU {product.sku}</p>
            {product.barcode && <p>EAN {product.barcode}</p>}
            <div className="product-detail-tags">
              <span className={"product-detail-tag" + (product.active ? " is-active" : "")}>{product.active ? "Aktiv" : "Inaktiv"}</span>
              <span className="product-detail-tag">{count} {count === 1 ? "lagerplats" : "lagerplatser"}</span>
            </div>
          </div>
        </header>} />
    </article>
  </AppShell>;
}
