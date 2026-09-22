import { MaterialArrow } from "@/components/material-arrow";
import Link from "next/link";
import { pageSession } from "@/lib/server/page-auth";
import { OrganizationShell } from "@/features/organizations/organization-shell";
import { OrganizationForm } from "@/features/organizations/organization-form";

export default async function NewOrganizationPage() {
  const session = await pageSession();

  return (
    <OrganizationShell session={session}>
      <div className="mx-auto max-w-xl">
        <Link href="/organizations" className="mb-6 inline-flex min-h-13 items-center gap-2 text-sm text-cyan">
          <span aria-hidden="true"><MaterialArrow name="back" /></span> Till företagsvalet
        </Link>
        <p className="eyebrow">Ett nytt arbetsutrymme</p>
        <h1>Skapa företag</h1>
        <p className="mb-7 text-sm leading-7 text-muted">
          Börja med namn och företagskod. Du blir administratör och kan sedan lägga till företagets lager och platser.
        </p>
        <section className="panel">
          <h2 className="mb-6 text-lg">Företagsuppgifter</h2>
          <OrganizationForm />
        </section>
      </div>
    </OrganizationShell>
  );
}
