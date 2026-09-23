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
    <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-7">
      <header className="print-hidden flex min-h-24 items-center justify-between gap-3 border-b border-line/60">
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
      <div className="grid items-start gap-7 pt-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-9 print:pt-0">
        <aside className="print-hidden">
          <AppNav />
        </aside>
        <main id="main-content" className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
