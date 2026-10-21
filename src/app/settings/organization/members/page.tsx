import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AppIcon } from "@/components/app-icon";
import { PageHeading } from "@/components/page-heading";
import { OrganizationMembers } from "@/features/organizations/organization-members";
import { listOrganizationMembers } from "@/features/organizations/members";
import { pageTenant } from "@/lib/server/page-auth";

export default async function OrganizationMembersPage() {
  const context = await pageTenant();
  if (context.role !== "admin") redirect("/dashboard");
  const members = await listOrganizationMembers(context);
  return <AppShell context={context}>
    <Link href="/settings/organization" className="product-back"><AppIcon name="chevron" width={15} height={15} />Företagsinställningar</Link>
    <PageHeading title="Medlemmar och behörigheter" description="Bjud in personer till företaget och ge dem rätt åtkomst från början." />
    <OrganizationMembers initial={members} />
  </AppShell>;
}
