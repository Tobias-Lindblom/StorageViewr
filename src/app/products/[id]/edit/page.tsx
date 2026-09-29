import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MaterialArrow } from "@/components/material-arrow";
import { PageHeading } from "@/components/page-heading";
import { ProductForm } from "@/features/products/product-form";
import { getProduct } from "@/features/products/service";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";
import Link from "next/link";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await pageTenant();
  if (context.role !== "admin") notFound();
  const { id } = await params;
  const product = await pageResource(() => getProduct(context, id));
  return (
    <AppShell context={context}>
      <Link
        href={"/products/" + id}
        className="mb-4 inline-flex min-h-13 items-center gap-2 text-sm text-accent"
      >
        <MaterialArrow name="back" />
        Till produkten
      </Link>
      <PageHeading
        title="Redigera produkt"
        description={product.name + " · " + product.sku}
      />
      <ProductForm initial={product} />
    </AppShell>
  );
}
