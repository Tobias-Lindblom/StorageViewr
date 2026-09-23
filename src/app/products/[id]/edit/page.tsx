import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { ProductForm } from "@/features/products/product-form";
import { getProduct } from "@/features/products/service";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";
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
      <PageHeading title="Redigera produkt" />
      <ProductForm initial={product} />
    </AppShell>
  );
}
