import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import { pageSession } from "@/lib/server/page-auth";
import { OrganizationShell } from "@/features/organizations/organization-shell";
import { OrganizationForm } from "@/features/organizations/organization-form";

export default async function NewOrganizationPage() {
  const session = await pageSession();
  return <OrganizationShell session={session}>
    <section className="organization-create" aria-labelledby="create-organization-heading">
      <Link href="/organizations" className="organization-back"><AppIcon name="chevron" width={16} height={16} />Tillbaka</Link>
      <div className="organization-page-heading">
        <h1 id="create-organization-heading">Skapa företag</h1>
        <p>Du blir administratör och kan sedan lägga till lager, platser och medlemmar.</p>
      </div>
      <div className="organization-form-panel">
        <h2>Företagsuppgifter</h2>
        <OrganizationForm compact />
      </div>
    </section>
  </OrganizationShell>;
}
