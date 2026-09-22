"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client-api";

export function AccountForm({ name, email, embedded = false }: { name: string; email: string; embedded?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await clientApi("/api/account", "PATCH", { name: form.get("name") });
      setMessage("Ditt namn har sparats.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Försök igen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className={embedded ? "space-y-5" : "panel max-w-xl space-y-5"}>
      {!embedded && <h2 className="mb-0!">Dina uppgifter</h2>}
      <label>
        Namn
        <input name="name" defaultValue={name} minLength={2} maxLength={100} required autoComplete="name" disabled={pending} />
      </label>
      <div>
        <p className="text-sm font-medium">E-postadress</p>
        <p className="mt-2 break-all text-sm text-muted">{email}</p>
        <p className="mt-2 text-xs leading-5 text-muted">Din e-postadress används för inloggning.</p>
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      {message && <p role="status" className="text-sm text-cyan">{message}</p>}
      <button className="button w-full sm:w-auto" disabled={pending}>
        {pending ? "Sparar…" : "Spara ändringar"}
      </button>
    </form>
  );
}
