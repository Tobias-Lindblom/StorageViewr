import type { ReactNode } from "react";
import { BrandLogo } from "./brand-logo";
import { AccountMenu } from "./account-menu";
import type { OrganizationDocumentDetails } from "@/features/organizations/types";

export function WorkspaceFrame({ children, mobileDetail = false }: { children: ReactNode; mobileDetail?: boolean }) {
  return <div className={(mobileDetail ? " app-shell app-workspace mobile-detail " : " app-shell app-workspace ") +
    "mx-auto flex h-dvh max-w-7xl flex-col overflow-hidden overscroll-none lg:px-7 print:h-auto print:max-w-none print:overflow-visible print:px-0"}>
    {children}
  </div>;
}

export function WorkspaceHeader({ href = "/dashboard", account, organization }: {
  href?: string;
  account: { name: string; email: string };
  organization?: OrganizationDocumentDetails & { name: string; slug: string; role: "admin" | "warehouse" };
}) {
  return <header className="workspace-header print-hidden relative z-40 flex shrink-0 items-center justify-between gap-3 px-4 lg:px-0">
    <BrandLogo href={href} compact />
    <AccountMenu account={account} organization={organization} />
  </header>;
}
