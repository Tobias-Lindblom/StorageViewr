"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { clientApi } from "@/lib/client-api";

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
    <form onSubmit={submit} className="space-y-5">
      {registration && (
        <label>
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
      <label>
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
      <label>
        Lösenord
        <input
          name="password"
          type="password"
          autoComplete={registration ? "new-password" : "current-password"}
          required
          minLength={registration ? 12 : 1}
          maxLength={128}
          disabled={pending}
        />
        {registration && (
          <span className="mt-2 block text-xs leading-5 font-normal text-muted">
            Använd minst 12 tecken.
          </span>
        )}
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="button w-full" disabled={pending}>
        {pending
          ? registration
            ? "Skapar konto…"
            : "Loggar in…"
          : registration
            ? "Skapa konto"
            : "Logga in"}
      </button>
      <p className="border-t border-line/60 pt-5 text-center text-sm text-muted">
        {registration ? "Har du redan ett konto? " : "Ny här? "}
        <Link
          className="font-medium text-cyan hover:underline"
          href={
            (registration ? "/login" : "/register") +
            (returnTo ? "?next=" + encodeURIComponent(returnTo) : "")
          }
        >
          {registration ? "Logga in" : "Skapa konto"}
        </Link>
      </p>
    </form>
  );
}
