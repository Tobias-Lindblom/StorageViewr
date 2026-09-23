import { MaterialArrow } from "@/components/material-arrow";
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

  return (
    <OrganizationShell session={session} organizations={organizations}>
      <div className="mb-8 sm:mb-10">
        <h1 className="mb-4 text-3xl sm:text-4xl lg:text-5xl">
          {hasOrganizations
            ? "Välkommen tillbaka."
            : "Välkommen till StorageViewr."}
        </h1>
        <p className="max-w-xl text-sm leading-7 text-muted sm:text-base">
          {returnTo
            ? "Välj företaget som den skannade lagerplatsen tillhör."
            : hasOrganizations
              ? "Välj ditt företag och fortsätt där lagerarbetet börjar."
              : "Skapa ett arbetsutrymme för ditt företag. Där samlar du lager, platser och kollegor."}
        </p>
      </div>

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
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8">
          <section aria-labelledby="organizations-heading" className="min-w-0">
            <div className="mb-4 flex items-center gap-3">
              <h2 id="organizations-heading" className="mb-0! text-lg">
                Dina företag
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

          <aside className="rounded-2xl border border-violet-400/20 bg-linear-to-br from-violet-900/20 to-surface p-5 lg:mt-12 lg:p-6">
            <div className="mb-4 flex items-center gap-3 lg:mb-5">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/10 text-xl text-accent"
                aria-hidden="true"
              >
                +
              </span>
              <h2 className="mb-0! text-base lg:text-lg">Ett till företag?</h2>
            </div>
            <p className="mb-5 text-sm leading-6 text-muted">
              Skapa ett eget arbetsutrymme för ett nytt företag, med separata
              lager och medlemmar.
            </p>
            <Link href="/organizations/new" className="button-secondary w-full">
              Skapa företag{" "}
              <span className="ml-3 text-accent" aria-hidden="true">
                <MaterialArrow name="outward" />
              </span>
            </Link>
          </aside>
        </div>
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
