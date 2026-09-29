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
    <div className="mx-auto flex h-dvh max-w-7xl flex-col overflow-hidden px-4 sm:px-7 print:h-auto print:max-w-none print:overflow-visible print:px-0">
      <header className="print-hidden relative z-40 flex min-h-20 shrink-0 items-center justify-between gap-3 sm:min-h-22">
        <BrandLogo href="/dashboard" />
        <AccountMenu
          account={account}
          organization={{
            name: organization.name,
            slug: organization.slug,
            role: context.role,
          }}
        />
      </header>
      <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[200px_minmax(0,1fr)] lg:grid-rows-1 lg:gap-9 print:block">
        <aside className="print-hidden pb-5 pt-1 lg:min-h-0 lg:overflow-y-auto lg:py-6">
          <AppNav />
        </aside>
        <main
          id="main-content"
          className="min-w-0 overflow-y-auto overscroll-contain pb-12 lg:py-6 print:overflow-visible print:py-0"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
