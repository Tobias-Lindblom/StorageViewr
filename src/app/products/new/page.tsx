import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { ProductForm } from "@/features/products/product-form";
import { pageTenant } from "@/lib/server/page-auth";
export default async function NewProductPage() {
  const context = await pageTenant();
  if (context.role !== "admin") notFound();
  return (
    <AppShell context={context}>
      <PageHeading
        title="Ny produkt"
        description="Lägg till en artikel i företagets produktregister."
      />
      <ProductForm />
    </AppShell>
  );
}
