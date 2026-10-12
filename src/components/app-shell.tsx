import type { ReactNode } from "react";
import type { TenantContext } from "@/lib/server/tenant";
import { getOrganization } from "@/features/organizations/service";
import { BrandLogo } from "./brand-logo";
import { getAccount } from "@/features/account/service";
import { AccountMenu } from "./account-menu";
import { AppNav } from "./app-nav";

export async function AppShell({
  context,
  children,
}: {
  context: TenantContext;
  children: ReactNode;
}) {
  const [organization, account] = await Promise.all([
    getOrganization(context),
    getAccount(context),
  ]);
  return (
    <div className="mx-auto flex h-dvh max-w-7xl flex-col overflow-hidden overscroll-none px-4 sm:px-7 print:h-auto print:max-w-none print:overflow-visible print:px-0">
      <header className="print-hidden relative z-40 flex min-h-20 shrink-0 items-center justify-between gap-3 sm:min-h-22">
        <BrandLogo href="/dashboard" />
        <div className="hidden lg:block">
          <AccountMenu
            account={account}
            organization={{
              name: organization.name,
              slug: organization.slug,
              role: context.role,
            }}
          />
        </div>
      </header>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[200px_minmax(0,1fr)] lg:grid-rows-1 lg:gap-9 print:block">
        <aside className="print-hidden relative z-40 col-start-1 row-start-2 shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:col-start-1 lg:row-start-1 lg:min-h-0 lg:overflow-y-auto lg:py-6">
          <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,1fr)] rounded-[1.4rem] border border-line/55 bg-surface/95 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_-10px_32px_rgba(0,0,0,0.24)] backdrop-blur-xl lg:hidden">
            <div className="min-w-0 flex-1">
              <AppNav />
            </div>
            <AccountMenu
              dock
              account={account}
              organization={{
                name: organization.name,
                slug: organization.slug,
                role: context.role,
              }}
            />
          </div>
          <div className="hidden lg:block">
            <AppNav />
          </div>
        </aside>
        <main
          id="main-content"
          className="col-start-1 row-start-1 min-w-0 overflow-y-auto overscroll-contain pb-10 lg:col-start-2 lg:row-start-1 lg:py-6 print:overflow-visible print:py-0"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
