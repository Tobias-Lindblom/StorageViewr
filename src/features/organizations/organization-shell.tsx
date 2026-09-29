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
    <div className="mx-auto flex h-dvh max-w-7xl flex-col overflow-hidden px-4 sm:px-7">
      <header className="flex min-h-24 shrink-0 items-center justify-between gap-3 border-b border-line/60">
        <BrandLogo href="/organizations" />
        <AccountMenu account={account} organization={selected} />
      </header>
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain py-9 sm:py-12 lg:py-16">
        {children}
      </main>
    </div>
  );
}
