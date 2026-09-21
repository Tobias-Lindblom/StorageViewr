import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";

export function OrganizationShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-svh max-w-7xl flex-col px-4 sm:px-7">
      <header className="flex min-h-24 items-center justify-between gap-3 border-b border-line/60">
        <BrandLogo href="/organizations" />
        <LogoutButton />
      </header>
      <main className="min-w-0 flex-1 py-9 sm:py-12 lg:py-16">{children}</main>
      <footer className="border-t border-line/60 py-6 text-xs leading-6 text-muted">
        StorageViewr <span className="mx-2 text-accent" aria-hidden="true">·</span>
        Ditt lager, under kontroll.
      </footer>
    </div>
  );
}
