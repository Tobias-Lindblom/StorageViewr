import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthPageShell } from "@/features/auth/auth-page-shell";
import { registrationEnabled } from "@/features/auth/registration";
import { locationReturnPath } from "@/validation/return-path";
import { getOrganizationInvitation } from "@/features/organizations/members";
import { pageResource } from "@/lib/server/page-resource";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; invite?: string }>;
}) {
  const query = await searchParams;
  const invitation = query.invite ? await pageResource(() => getOrganizationInvitation(query.invite)) : null;
  const returnTo = invitation ? `/invite/${query.invite}` : locationReturnPath(query.next);
  const available = Boolean(invitation) || registrationEnabled();

  if (!available) redirect("/pilot");

  return (
    <AuthPageShell
      title="Skapa konto"
      description={invitation ? `Skapa ditt konto för att gå med i ${invitation.organizationName}.` : "Skapa ditt personliga konto. Därefter skapar eller väljer du företag."}
    >
      <AuthForm mode="register" returnTo={returnTo} initialEmail={invitation?.email} inviteToken={query.invite} />
    </AuthPageShell>
  );
}
