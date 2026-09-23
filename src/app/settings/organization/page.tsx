import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { pageTenant } from "@/lib/server/page-auth";
import { getOrganization } from "@/features/organizations/service";
import { OrganizationForm } from "@/features/organizations/organization-form";

export default async function OrganizationPage() {
  const context = await pageTenant();
  const organization = await getOrganization(context);
  return (
    <AppShell context={context}>
      <PageHeading
        eyebrow="Inställningar"
        title="Ditt företag"
        description={"Företagskod: " + organization.slug}
      />
      <section className="panel max-w-2xl">
        <h2>Företagsuppgifter</h2>
        {context.role === "admin" ? (
          <OrganizationForm name={organization.name} />
        ) : (
          <p className="text-muted">
            En administratör kan ändra företagets uppgifter.
          </p>
        )}
      </section>
    </AppShell>
  );
}
