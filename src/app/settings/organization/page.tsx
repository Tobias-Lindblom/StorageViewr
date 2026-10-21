import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AppIcon } from "@/components/app-icon";
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
        title="Ditt företag"
        description={"Företagskod: " + organization.slug}
        action={context.role === "admin" ? <Link href="/settings/organization/members" className="button"><AppIcon name="user" width={17} height={17} />Hantera medlemmar</Link> : undefined}
      />
      <section className="panel max-w-2xl">
        <h2>Företagsuppgifter</h2>
        {context.role === "admin" ? (
          <OrganizationForm name={organization.name} details={organization} />
        ) : (
          <p className="text-muted">
            En administratör kan ändra företagets uppgifter.
          </p>
        )}
      </section>
    </AppShell>
  );
}
