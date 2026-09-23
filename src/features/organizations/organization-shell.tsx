import type { ReactNode } from "react";
import type { pageSession } from "@/lib/server/page-auth";
import { BrandLogo } from "@/components/brand-logo";
import { AccountMenu } from "@/components/account-menu";
import { getAccount } from "@/features/account/service";
import { listOrganizations } from "./service";

export async function OrganizationShell({
  children,
  session,
  organizations,
}: {
  children: ReactNode;
  session: Awaited<ReturnType<typeof pageSession>>;
  organizations?: Awaited<ReturnType<typeof listOrganizations>>;
}) {
  const [account, memberships] = await Promise.all([
    getAccount(session),
    organizations ?? listOrganizations(session),
  ]);
  const selected = memberships.find(
    (organization) => organization.id === session.organizationId?.toString(),
  );

  return (
    <div className="mx-auto flex min-h-svh max-w-7xl flex-col px-4 sm:px-7">
      <header className="flex min-h-24 items-center justify-between gap-3 border-b border-line/60">
        <BrandLogo href="/organizations" />
        <AccountMenu account={account} organization={selected} />
      </header>
      <main className="min-w-0 flex-1 py-9 sm:py-12 lg:py-16">{children}</main>
    </div>
  );
}
