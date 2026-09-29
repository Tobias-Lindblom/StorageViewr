import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MaterialArrow } from "@/components/material-arrow";
import { PageHeading } from "@/components/page-heading";
import { ProductForm } from "@/features/products/product-form";
import { pageTenant } from "@/lib/server/page-auth";
import Link from "next/link";

export default async function NewProductPage() {
  const context = await pageTenant();
  if (context.role !== "admin") notFound();
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
        title="Ny produkt"
        description="Lägg till en artikel i produktregistret."
      />
      <ProductForm />
    </AppShell>
  );
}
