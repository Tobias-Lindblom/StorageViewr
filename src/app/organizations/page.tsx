import { MaterialArrow } from "@/components/material-arrow";
import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import { PageHeading } from "@/components/page-heading";
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

  return (
    <OrganizationShell session={session} organizations={organizations}>
      <PageHeading
        title={hasOrganizations ? "Välj företag" : "Välkommen till StorageViewr"}
        description={
          returnTo
            ? "Välj företaget som den skannade lagerplatsen tillhör."
            : hasOrganizations
              ? "Fortsätt till företagets lager och inventeringar."
              : "Skapa ett arbetsutrymme för företagets lager, platser och medlemmar."
        }
        action={
          hasOrganizations ? (
            <Link href="/organizations/new" className="button-secondary">
              + Skapa företag
            </Link>
          ) : undefined
        }
      />

      {returnTo && (
        <div className="mb-7 flex items-start gap-3 rounded-xl border border-cyan/20 bg-cyan/5 p-4 text-sm leading-6 text-cyan">
          <span className="mt-0.5 shrink-0">
            <AppIcon name="qr" />
          </span>
          <p>
            Din skannade lagerplats öppnas efter att du har valt rätt företag.
          </p>
        </div>
      )}

      {hasOrganizations ? (
        <section
          aria-labelledby="organizations-heading"
          className="max-w-4xl"
        >
          <div className="mb-4 flex items-center gap-3">
            <h2 id="organizations-heading" className="mb-0! text-xl!">
              Företag
            </h2>
            <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs tabular-nums text-muted">
              {organizations.length}
            </span>
          </div>
          <OrganizationList
            organizations={organizations}
            returnTo={returnTo}
            selectedOrganizationId={session.organizationId?.toString()}
          />
        </section>
      ) : (
        <section className="max-w-3xl rounded-2xl border border-violet-400/25 bg-linear-to-br from-violet-900/25 to-surface p-6 sm:p-8">
          <span className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-500/10 text-accent">
            <AppIcon name="warehouse" width={26} height={26} />
          </span>
          <h2 className="text-2xl">Börja med ditt första företag.</h2>
          <p className="mb-7 max-w-lg text-sm leading-7 text-muted">
            Ge företaget ett namn, lägg till ditt första lager och skapa
            platserna som gör det lätt att hitta rätt.
          </p>
          <Link href="/organizations/new" className="button w-full sm:w-auto">
            Skapa ditt första företag{" "}
            <span aria-hidden="true">
              <MaterialArrow name="forward" />
            </span>
          </Link>
        </section>
      )}
    </OrganizationShell>
  );
}
