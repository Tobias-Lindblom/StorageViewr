import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import { pageSession } from "@/lib/server/page-auth";
import { listOrganizations } from "@/features/organizations/service";
import { OrganizationList } from "@/features/organizations/organization-list";
import { OrganizationShell } from "@/features/organizations/organization-shell";
import { locationReturnPath } from "@/validation/return-path";

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const returnTo = locationReturnPath((await searchParams).next);
  const session = await pageSession(returnTo);
  const organizations = await listOrganizations(session);
  const hasOrganizations = organizations.length > 0;

  return <OrganizationShell session={session} organizations={organizations}>
    <section className="organization-chooser" aria-labelledby="organization-page-heading">
      <div className="organization-page-heading">
        <h1 id="organization-page-heading">{hasOrganizations ? "Välj företag" : "Välkommen"}</h1>
        <p>{returnTo ? "Välj företaget som den skannade lagerplatsen tillhör." :
          hasOrganizations ? "Öppna företagets lager och inventeringar." : "Kom igång med ditt lager i StorageViewr."}</p>
      </div>
      {returnTo && <div className="organization-scan-notice">
        <AppIcon name="qr" width={21} height={21} />
        <p>Din skannade lagerplats öppnas när du har valt rätt företag.</p>
      </div>}
      {hasOrganizations ? <>
        <div className="organization-list-heading">
          <h2 id="organizations-heading">Företag <span>{organizations.length}</span></h2>
          <Link href="/organizations/new" className="organization-primary-action"><span aria-hidden="true">+</span> Skapa företag</Link>
        </div>
        <section aria-labelledby="organizations-heading">
          <OrganizationList organizations={organizations} returnTo={returnTo}
            selectedOrganizationId={session.organizationId?.toString()} />
        </section>
      </> : <div className="organization-empty-card">
        <span className="organization-empty-icon"><AppIcon name="warehouse" width={27} height={27} /></span>
        <h2>Skapa ditt första företag</h2>
        <p>Samla företagets produkter, lagerplatser och inventeringar på ett ställe.</p>
        <Link href="/organizations/new" className="organization-primary-action">
          <span aria-hidden="true">+</span> Skapa företag
        </Link>
      </div>}
    </section>
  </OrganizationShell>;
}
