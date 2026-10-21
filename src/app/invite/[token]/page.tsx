import type { Metadata } from "next";
import { AppIcon } from "@/components/app-icon";
import { AuthPageShell } from "@/features/auth/auth-page-shell";
import { getAccount } from "@/features/account/service";
import { InvitationAccept } from "@/features/organizations/invitation-accept";
import { getOrganizationInvitation } from "@/features/organizations/members";
import styles from "@/features/organizations/invitation.module.css";
import { optionalSession } from "@/lib/server/session";
import { pageResource } from "@/lib/server/page-resource";

export const metadata: Metadata = { title: "Företagsinbjudan | StorageViewr" };

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await pageResource(() => getOrganizationInvitation(token));
  const session = await optionalSession();
  const account = session ? await getAccount(session) : null;
  const role = invitation.role === "admin" ? "Administratör" : "Lagerpersonal";
  return <AuthPageShell title={`Gå med i ${invitation.organizationName}`} description="Du har blivit inbjuden till företagets lager i StorageViewr.">
    <div className={styles.summary}>
      <div className={styles.company}>
        <span className={styles.companyIcon}><AppIcon name="warehouse" width={21} height={21} /></span>
        <div><strong>{invitation.organizationName}</strong><span>{role}</span></div>
      </div>
      <p className={styles.details}>Inbjudan gäller <strong>{invitation.email}</strong> och kan användas till och med {new Date(invitation.expiresAt).toLocaleDateString("sv-SE")}.</p>
      <InvitationAccept token={token} email={invitation.email} accountEmail={account?.email} />
    </div>
  </AuthPageShell>;
}
