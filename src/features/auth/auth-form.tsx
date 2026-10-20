"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { clientApi } from "@/lib/client-api";
import styles from "./auth-page.module.css";

export function AuthForm({
  mode,
  returnTo,
}: {
  mode: "login" | "register";
  returnTo?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const registration = mode === "register";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const data = {
      email: form.get("email"),
      password: form.get("password"),
      ...(registration ? { name: form.get("name") } : {}),
    };
    try {
      await clientApi("/api/auth/" + mode, "POST", data);
      router.push(
        "/organizations" +
          (returnTo ? "?next=" + encodeURIComponent(returnTo) : ""),
      );
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Försök igen.");
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className={styles.form} aria-busy={pending}>
      {registration && (
        <label className={styles.field}>
          Ditt namn
          <input
            name="name"
            autoComplete="name"
            placeholder="Exempel: Tobias Andersson"
            required
            minLength={2}
            maxLength={100}
            disabled={pending}
          />
        </label>
      )}
      <label className={styles.field}>
        E-postadress
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="namn@foretag.se"
          spellCheck={false}
          required
          maxLength={254}
          disabled={pending}
        />
      </label>
      <div className={styles.field}>
        <label htmlFor="auth-password">Lösenord</label>
        <span className={styles.passwordField}>
          <input
            id="auth-password"
            name="password"
            type={passwordVisible ? "text" : "password"}
            autoComplete={registration ? "new-password" : "current-password"}
            required
            minLength={registration ? 12 : 1}
            maxLength={128}
            disabled={pending}
          />
          <button
            type="button"
            className={styles.passwordToggle}
            aria-label={passwordVisible ? "Dölj lösenordet" : "Visa lösenordet"}
            aria-pressed={passwordVisible}
            disabled={pending}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? "Dölj" : "Visa"}
          </button>
        </span>
        {registration && (
          <span className={styles.hint}>
            Använd minst 12 tecken.
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <button className={`button ${styles.submit}`} disabled={pending}>
        {pending
          ? registration
            ? "Skapar konto…"
            : "Loggar in…"
          : registration
            ? "Skapa konto"
            : "Logga in"}
      </button>
      <p className={styles.alternate}>
        {registration ? "Har du redan ett konto? " : "Vill du testa StorageViewr? "}
        <Link
          href={
            registration
              ? "/login" +
                (returnTo ? "?next=" + encodeURIComponent(returnTo) : "")
              : "/pilot"
          }
        >
          {registration ? "Logga in" : "Starta pilot"}
        </Link>
      </p>
    </form>
  );
}
