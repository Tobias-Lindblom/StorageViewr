import { MaterialArrow } from "@/components/material-arrow";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { AccountForm } from "@/features/account/account-form";
import { getAccount } from "@/features/account/service";
import { OrganizationShell } from "@/features/organizations/organization-shell";
import { pageSession } from "@/lib/server/page-auth";
import { tenantForSession, type TenantContext } from "@/lib/server/tenant";
import { AppError } from "@/lib/server/errors";

export default async function AccountSettingsPage() {
  const session = await pageSession();
  const account = await getAccount(session);
  let context: TenantContext | undefined;
  try {
    context = await tenantForSession(session);
  } catch (error) {
    if (!(error instanceof AppError && (error.status === 403 || error.status === 409))) throw error;
  }

  const content = (
    <>
      <Link className="mb-5 inline-flex min-h-13 items-center gap-2 text-sm text-cyan" href={context ? "/dashboard" : "/organizations"}>
        <MaterialArrow name="back" /> {context ? "Till översikten" : "Till företagsvalet"}
      </Link>
      <PageHeading title="Kontoinställningar" description="Dina personliga uppgifter gäller i alla dina företag." />
      <AccountForm name={account.name} email={account.email} />
    </>
  );
  return context ? <AppShell context={context}>{content}</AppShell> : <OrganizationShell session={session}>{content}</OrganizationShell>;
}
