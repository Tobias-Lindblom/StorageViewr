"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client-api";

export function AccountForm({
  name,
  email,
  embedded = false,
  id,
  hideSubmit = false,
  onPendingChange,
}: {
  name: string;
  email: string;
  embedded?: boolean;
  id?: string;
  hideSubmit?: boolean;
  onPendingChange?: (pending: boolean) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    onPendingChange?.(true);
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
      onPendingChange?.(false);
    }
  }

  return (
    <form
      id={id}
      onSubmit={submit}
      className={embedded ? "space-y-6" : "panel max-w-xl space-y-6"}
    >
      {!embedded && <h2 className="mb-0!">Dina uppgifter</h2>}
      <label>
        Namn
        <input
          name="name"
          defaultValue={name}
          minLength={2}
          maxLength={100}
          required
          autoComplete="name"
          disabled={pending}
        />
        <span className="mt-2 block text-xs leading-5 font-normal text-muted">
          Namnet visas i historik och inventeringsrapporter.
        </span>
      </label>
      <div>
        <p className="text-sm font-medium">E-postadress</p>
        <div className="mt-2 flex min-h-13 items-center rounded-xl border border-line/70 bg-canvas/60 px-4 py-3 text-sm text-muted">
          <span className="break-all">{email}</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          Används för inloggning och kan inte ändras här.
        </p>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-xl border border-emerald-400/20 bg-emerald-400/8 p-3 text-sm text-emerald-200"
        >
          {message}
        </p>
      )}
      {!hideSubmit && (
        <button className="button w-full sm:w-auto" disabled={pending}>
          {pending ? "Sparar…" : "Spara ändringar"}
        </button>
      )}
    </form>
  );
}
