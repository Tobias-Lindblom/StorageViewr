import type { ReactNode } from "react";
import type { pageSession } from "@/lib/server/page-auth";
import { WorkspaceFrame, WorkspaceHeader } from "@/components/workspace-frame";
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
    <WorkspaceFrame>
      <WorkspaceHeader href="/organizations" account={account} organization={selected} />
      <main id="main-content" className="organization-workspace min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 lg:px-0">
        {children}
      </main>
    </WorkspaceFrame>
  );
}
