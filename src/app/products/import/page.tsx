import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { MaterialArrow } from "@/components/material-arrow";
import { PageHeading } from "@/components/page-heading";
import { ProductImport } from "@/features/products/product-import";
import { pageTenant } from "@/lib/server/page-auth";

export default async function ImportProductsPage() {
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
        title="Importera produkter"
        description="Lägg till flera produkter från en CSV-fil. Du får granska innehållet före importen."
      />
      <ProductImport />
    </AppShell>
  );
}
