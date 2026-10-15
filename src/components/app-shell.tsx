import type { ReactNode } from "react";
import type { TenantContext } from "@/lib/server/tenant";
import { getOrganization } from "@/features/organizations/service";
import { getAccount } from "@/features/account/service";
import { MoreMenu } from "./more-menu";
import { AppNav } from "./app-nav";
import { WorkspaceFrame, WorkspaceHeader } from "./workspace-frame";

export async function AppShell({ context, children, mobileDetail = false, account: suppliedAccount, contentClassName = "" }: {
  context: TenantContext;
  children: ReactNode;
  mobileDetail?: boolean;
  account?: { name: string; email: string };
  contentClassName?: string;
}) {
  const [organization, account] = await Promise.all([
    getOrganization(context),
    suppliedAccount ? Promise.resolve(suppliedAccount) : getAccount(context),
  ]);
  const company = { ...organization, role: context.role };
  return (
    <WorkspaceFrame mobileDetail={mobileDetail}>
      <WorkspaceHeader account={account} organization={company} />
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[200px_minmax(0,1fr)] lg:grid-rows-1 lg:gap-9 print:block">
        <aside className="app-navigation print-hidden relative z-40 col-start-1 row-start-2 shrink-0 lg:col-start-1 lg:row-start-1 lg:min-h-0 lg:overflow-y-auto lg:py-6">
          <div className="mobile-dock grid grid-cols-[minmax(0,4fr)_minmax(0,1fr)] lg:hidden">
            <AppNav admin={context.role === "admin"} mobile />
            <MoreMenu admin={context.role === "admin"} />
          </div>
          <div className="hidden lg:block"><AppNav admin={context.role === "admin"} /></div>
        </aside>
        <main id="main-content" className={"app-content col-start-1 row-start-1 min-h-0 min-w-0 px-4 pb-8 lg:col-start-2 lg:row-start-1 lg:px-0 lg:py-6 print:overflow-visible print:py-0 " + contentClassName}>
          {children}
        </main>
      </div>
    </WorkspaceFrame>
  );
}
