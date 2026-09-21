"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { clientApi } from "@/lib/client-api";

export function AuthForm({ mode, returnTo }: { mode: "login" | "register"; returnTo?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const registration = mode === "register";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const data = { email: form.get("email"), password: form.get("password"), ...(registration ? { name: form.get("name") } : {}) };
    try {
      await clientApi("/api/auth/" + mode, "POST", data);
      router.push("/organizations" + (returnTo ? "?next=" + encodeURIComponent(returnTo) : "")); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Försök igen."); setPending(false); }
  }
  return <form onSubmit={submit} className="space-y-5">
    {registration && <label>Ditt namn<input name="name" autoComplete="name" required minLength={2} maxLength={100} /></label>}
    <label>E-post<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
    <label>Lösenord<input name="password" type="password" autoComplete={registration ? "new-password" : "current-password"} required minLength={registration ? 12 : 1} maxLength={128} /></label>
    {registration && <p className="text-sm text-muted">Använd minst 12 tecken.</p>}
    {error && <p role="alert" className="error">{error}</p>}
    <button className="button w-full" disabled={pending}>{pending ? "Vänta…" : registration ? "Skapa konto" : "Logga in"}</button>
    <p className="text-center text-sm text-muted">{registration ? "Har du redan ett konto? " : "Ny här? "}<Link className="text-cyan underline" href={(registration ? "/login" : "/register") + (returnTo ? "?next=" + encodeURIComponent(returnTo) : "")}>{registration ? "Logga in" : "Skapa konto"}</Link></p>
  </form>;
}
