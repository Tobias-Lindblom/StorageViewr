"use client";

import { useState, type FormEvent } from "react";
import { AppIcon } from "@/components/app-icon";
import { clientApi } from "@/lib/client-api";
import styles from "./organization-members.module.css";

type Role = "admin" | "warehouse";
type Member = { id: string; name: string; email: string; role: Role; current: boolean };
type Invitation = { id: string; email: string; role: Role; expiresAt: string };
type CreatedInvitation = Invitation & { inviteUrl: string };

const roleLabel = (role: Role) => role === "admin" ? "Administratör" : "Lagerpersonal";

export function OrganizationMembers({ initial }: {
  initial: { members: Member[]; invitations: Invitation[] };
}) {
  const [invitations, setInvitations] = useState(initial.invitations);
  const [created, setCreated] = useState<CreatedInvitation | null>(null);
  const [pending, setPending] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setCopied(false);
    const form = new FormData(event.currentTarget);
    try {
      const invitation = await clientApi<CreatedInvitation>("/api/organization/members", "POST", {
        email: form.get("email"),
        role: form.get("role"),
      });
      setCreated(invitation);
      setInvitations(items => [invitation, ...items.filter(item => item.email !== invitation.email)]);
      event.currentTarget.reset();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Inbjudan kunde inte skapas.");
    } finally {
      setPending(false);
    }
  }

  async function copyLink() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.inviteUrl);
      setCopied(true);
    } catch {
      setError("Länken kunde inte kopieras automatiskt. Markera och kopiera den manuellt.");
    }
  }

  async function revoke(id: string) {
    setRevoking(id);
    setError("");
    try {
      await clientApi(`/api/organization/invitations/${id}`, "DELETE");
      setInvitations(items => items.filter(item => item.id !== id));
      if (created?.id === id) setCreated(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Inbjudan kunde inte återkallas.");
    } finally {
      setRevoking(null);
    }
  }

  return <div className={styles.layout}>
    <section className={styles.inviteCard} aria-labelledby="invite-member-heading">
      <div className={styles.sectionHeading}>
        <span className={styles.headingIcon}><AppIcon name="user" /></span>
        <div><h2 id="invite-member-heading">Bjud in medlem</h2><p>Välj vilken åtkomst personen ska få i företaget.</p></div>
      </div>
      <form onSubmit={invite} className={styles.form} aria-busy={pending}>
        <label className={styles.emailField}>E-postadress
          <input name="email" type="email" autoComplete="email" placeholder="namn@foretag.se" required maxLength={254} disabled={pending} />
        </label>
        <label>Behörighet
          <select name="role" defaultValue="warehouse" disabled={pending}>
            <option value="warehouse">Lagerpersonal</option>
            <option value="admin">Administratör</option>
          </select>
        </label>
        <div className={styles.roleHelp}>
          <p><strong>Lagerpersonal</strong><span>Kan arbeta med saldon, lagerplatser och inventeringar.</span></p>
          <p><strong>Administratör</strong><span>Kan även ändra struktur, företagsuppgifter och bjuda in medlemmar.</span></p>
        </div>
        <button className="button" disabled={pending}>{pending ? "Skapar inbjudan…" : "Skapa inbjudan"}</button>
      </form>
      {created && <div className={styles.created} role="status">
        <span className={styles.createdIcon}><AppIcon name="check" width={18} height={18} /></span>
        <div className={styles.createdContent}>
          <strong>Inbjudan är klar</strong>
          <p>Dela länken med {created.email}. Av säkerhetsskäl visas den bara här.</p>
          <div className={styles.linkRow}>
            <input aria-label="Inbjudningslänk" readOnly value={created.inviteUrl} onFocus={event => event.currentTarget.select()} />
            <button type="button" onClick={copyLink}>{copied ? "Kopierad" : "Kopiera"}</button>
          </div>
          <a className={styles.mailLink} href={`mailto:${created.email}?subject=${encodeURIComponent("Inbjudan till StorageViewr")}&body=${encodeURIComponent(`Du har blivit inbjuden till vårt lager i StorageViewr. Öppna länken för att gå med:\n\n${created.inviteUrl}`)}`}>Öppna i e-post</a>
        </div>
      </div>}
      {error && <p className="error" role="alert">{error}</p>}
    </section>

    <section className={styles.listCard} aria-labelledby="members-heading">
      <div className={styles.listHeading}><div><h2 id="members-heading">Medlemmar</h2><p>{initial.members.length} {initial.members.length === 1 ? "medlem" : "medlemmar"}</p></div></div>
      <ul className={styles.peopleList}>
        {initial.members.map(member => <li key={member.id}>
          <span className={styles.avatar} aria-hidden="true">{member.name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0] ?? "").join("").toLocaleUpperCase("sv")}</span>
          <span className={styles.personIdentity}><strong>{member.name}{member.current && <em>Du</em>}</strong><span>{member.email}</span></span>
          <span className={`${styles.roleBadge} ${member.role === "admin" ? styles.admin : ""}`}>{roleLabel(member.role)}</span>
        </li>)}
      </ul>
    </section>

    {invitations.length > 0 && <section className={styles.listCard} aria-labelledby="pending-heading">
      <div className={styles.listHeading}><div><h2 id="pending-heading">Väntande inbjudningar</h2><p>Inte accepterade ännu</p></div></div>
      <ul className={styles.peopleList}>
        {invitations.map(invitation => <li key={invitation.id}>
          <span className={`${styles.avatar} ${styles.pendingAvatar}`} aria-hidden="true"><AppIcon name="history" width={18} height={18} /></span>
          <span className={styles.personIdentity}><strong>{invitation.email}</strong><span>Gäller till {new Date(invitation.expiresAt).toLocaleDateString("sv-SE")}</span></span>
          <span className={styles.invitationActions}><span className={styles.roleBadge}>{roleLabel(invitation.role)}</span><button type="button" disabled={revoking === invitation.id} onClick={() => revoke(invitation.id)}>{revoking === invitation.id ? "Återkallar…" : "Återkalla"}</button></span>
        </li>)}
      </ul>
    </section>}
  </div>;
}
