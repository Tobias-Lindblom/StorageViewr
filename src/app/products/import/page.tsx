import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { ProductImport } from "@/features/products/product-import";
import { pageTenant } from "@/lib/server/page-auth";
export default async function ImportProductsPage() {
  const context = await pageTenant();
  if (context.role !== "admin") notFound();
  return (
    <AppShell context={context}>
      <PageHeading
        title="Importera produkter"
        description="Kontrollera innehållet innan du lägger till produkterna."
      />
      <ProductImport />
    </AppShell>
  );
}
