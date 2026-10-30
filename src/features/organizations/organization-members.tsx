"use client";

import { useRef, useState, type FormEvent } from "react";
import { AppIcon } from "@/components/app-icon";
import { BottomSheet } from "@/components/bottom-sheet";
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
  const [members, setMembers] = useState(initial.members);
  const [invitations, setInvitations] = useState(initial.invitations);
  const [created, setCreated] = useState<CreatedInvitation | null>(null);
  const [selected, setSelected] = useState<Member | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>("warehouse");
  const [memberPending, setMemberPending] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [pending, setPending] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const memberOpener = useRef<HTMLButtonElement>(null);

  function openMember(member: Member, opener: HTMLButtonElement) {
    memberOpener.current = opener;
    setSelected(member);
    setSelectedRole(member.role);
    setConfirmingRemove(false);
    setMemberError("");
  }

  function closeMember() {
    setSelected(null);
    setMemberPending(false);
    setConfirmingRemove(false);
    setMemberError("");
    requestAnimationFrame(() => memberOpener.current?.focus());
  }

  async function updateRole() {
    if (!selected || selectedRole === selected.role) return;
    setMemberPending(true);
    setMemberError("");
    try {
      const updated = await clientApi<{ id: string; role: Role }>(
        `/api/organization/members/${selected.id}`,
        "PATCH",
        { role: selectedRole },
      );
      const member = { ...selected, role: updated.role };
      setMembers(items => items.map(item => item.id === member.id ? member : item));
      setSelected(member);
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : "Behörigheten kunde inte ändras.");
    } finally {
      setMemberPending(false);
    }
  }

  async function removeMember() {
    if (!selected) return;
    setMemberPending(true);
    setMemberError("");
    try {
      await clientApi(`/api/organization/members/${selected.id}`, "DELETE");
      setMembers(items => items.filter(item => item.id !== selected.id));
      closeMember();
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : "Medlemmen kunde inte tas bort.");
      setMemberPending(false);
    }
  }

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
      <div className={styles.listHeading}><div><h2 id="members-heading">Medlemmar</h2><p>{members.length} {members.length === 1 ? "medlem" : "medlemmar"}</p></div></div>
      <ul className={styles.peopleList}>
        {members.map(member => <li key={member.id}>
          <span className={styles.avatar} aria-hidden="true">{member.name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0] ?? "").join("").toLocaleUpperCase("sv")}</span>
          <span className={styles.personIdentity}><strong>{member.name}{member.current && <em>Du</em>}</strong><span>{member.email}</span></span>
          <span className={`${styles.roleBadge} ${member.role === "admin" ? styles.admin : ""}`}>{roleLabel(member.role)}</span>
          {!member.current && <button type="button" className={styles.manageButton}
            aria-label={`Hantera ${member.name}`} onClick={event => openMember(member, event.currentTarget)}>
            <AppIcon name="settings" width={16} height={16} /><span>Hantera</span>
          </button>}
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

    {selected && <BottomSheet title="Hantera medlem" subtitle={selected.email} onClose={closeMember}
      footer={<div className={styles.sheetFooter}>
        <button type="button" className="button-secondary" disabled={memberPending} onClick={closeMember}>Stäng</button>
        <button type="button" className="button" disabled={memberPending || selectedRole === selected.role} onClick={updateRole}>
          {memberPending ? "Sparar…" : "Spara behörighet"}
        </button>
      </div>}>
      <div className={styles.memberSheet}>
        <div className={styles.memberSummary}>
          <span className={styles.avatar} aria-hidden="true">{selected.name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0] ?? "").join("").toLocaleUpperCase("sv")}</span>
          <span className={styles.personIdentity}><strong>{selected.name}</strong><span>{selected.email}</span></span>
        </div>
        <label>Behörighet
          <select value={selectedRole} disabled={memberPending} onChange={event => setSelectedRole(event.target.value as Role)}>
            <option value="warehouse">Lagerpersonal</option>
            <option value="admin">Administratör</option>
          </select>
        </label>
        <div className={styles.memberRoleHelp}>
          {selectedRole === "admin"
            ? <><strong>Administratör</strong><span>Kan ändra lagerstruktur och företagsuppgifter samt hantera medlemmar.</span></>
            : <><strong>Lagerpersonal</strong><span>Kan arbeta med saldon, lagerplatser och inventeringar.</span></>}
        </div>
        <section className={styles.dangerZone} aria-labelledby="remove-member-heading">
          <h3 id="remove-member-heading">Ta bort från företaget</h3>
          <p>Medlemmen förlorar omedelbart åtkomsten till företagets lager och inventeringar.</p>
          {!confirmingRemove ? <button type="button" disabled={memberPending} onClick={() => setConfirmingRemove(true)}>
            Ta bort medlem
          </button> : <div className={styles.removeConfirmation}>
            <strong>Vill du ta bort {selected.name}?</strong>
            <div><button type="button" disabled={memberPending} onClick={() => setConfirmingRemove(false)}>Avbryt</button>
              <button type="button" disabled={memberPending} onClick={removeMember}>{memberPending ? "Tar bort…" : "Bekräfta borttagning"}</button></div>
          </div>}
        </section>
        {memberError && <p className="error" role="alert">{memberError}</p>}
      </div>
    </BottomSheet>}
  </div>;
}
