import Link from "next/link";
import type { ReactNode } from "react";
import type { TenantContext } from "@/lib/server/tenant";
import { getOrganization } from "@/features/organizations/service";
import { BrandLogo } from "./brand-logo";
import { LogoutButton } from "./logout-button";
import { AppNav } from "./app-nav";

export async function AppShell({ context, children }: { context: TenantContext; children: ReactNode }) {
  const organization = await getOrganization(context);
  return <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-7">
    <header className="print-hidden flex min-h-24 items-center justify-between gap-3 border-b border-line/60">
      <BrandLogo href="/dashboard" /><LogoutButton />
    </header>
    <div className="print-hidden flex min-h-20 items-center justify-between gap-4 py-4">
      <div className="min-w-0"><p className="truncate text-sm font-semibold">{organization.name}</p><p className="mt-1 text-xs text-muted">{context.role === "admin" ? "Administratör" : "Lagerpersonal"}</p></div>
      <Link href="/organizations" className="inline-flex min-h-13 shrink-0 items-center text-xs text-cyan">Byt företag <span className="ml-2" aria-hidden="true">↗</span></Link>
    </div>
    <div className="grid items-start gap-7 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-9">
      <aside className="print-hidden"><AppNav admin={context.role === "admin"} /></aside>
      <main id="main-content" className="min-w-0">{children}</main>
    </div>
  </div>;
}
