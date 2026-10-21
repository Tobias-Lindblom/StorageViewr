"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApi } from "@/lib/client-api";
import styles from "./invitation.module.css";

export function InvitationAccept({ token, email, accountEmail }: {
  token: string; email: string; accountEmail?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const destination = `/invite/${token}`;

  async function accept() {
    setPending(true);
    setError("");
    try {
      await clientApi(`/api/invitations/${token}/accept`, "POST");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Inbjudan kunde inte accepteras.");
      setPending(false);
    }
  }

  async function changeAccount() {
    setPending(true);
    await clientApi("/api/auth/logout", "POST");
    router.push(`/login?next=${encodeURIComponent(destination)}`);
    router.refresh();
  }

  if (!accountEmail) return <div className={styles.actions}>
    <Link className="button" href={`/login?next=${encodeURIComponent(destination)}`}>Logga in och acceptera</Link>
    <Link className={styles.secondaryAction} href={`/register?invite=${token}`}>Skapa konto</Link>
  </div>;

  if (accountEmail !== email) return <div className={styles.accountMismatch}>
    <p>Du är inloggad som <strong>{accountEmail}</strong>. Inbjudan gäller <strong>{email}</strong>.</p>
    <button type="button" className={styles.secondaryAction} disabled={pending} onClick={changeAccount}>
      {pending ? "Byter konto…" : "Logga in med rätt konto"}
    </button>
  </div>;

  return <div className={styles.actions}>
    <button type="button" className="button" disabled={pending} onClick={accept}>
      {pending ? "Lägger till dig…" : "Acceptera inbjudan"}
    </button>
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </div>;
}
