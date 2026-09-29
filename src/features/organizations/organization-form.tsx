"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client-api";
export function OrganizationForm({
  name,
  id,
  hideSubmit = false,
  onPendingChange,
}: {
  name?: string;
  id?: string;
  hideSubmit?: boolean;
  onPendingChange?: (pending: boolean) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const editing = name !== undefined;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    onPendingChange?.(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await clientApi(
        editing ? "/api/organization" : "/api/organizations",
        editing ? "PATCH" : "POST",
        {
          name: form.get("name"),
          ...(!editing ? { slug: form.get("slug") } : {}),
        },
      );
      if (!editing) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setMessage("Företagsnamnet har sparats.");
        router.refresh();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Försök igen.");
    } finally {
      setPending(false);
      onPendingChange?.(false);
    }
  }
  return (
    <form id={id} onSubmit={submit} className="space-y-6">
      <label>
        Företagsnamn
        <input
          name="name"
          defaultValue={name}
          minLength={2}
          maxLength={100}
          required
          autoComplete="organization"
          disabled={pending}
        />
        <span className="mt-2 block text-xs leading-5 font-normal text-muted">
          Visas för företagets medlemmar och i inventeringsrapporter.
        </span>
      </label>
      {!editing && (
        <label>
          Företagskod
          <input
            name="slug"
            required
            minLength={3}
            maxLength={60}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="mitt-foretag"
            disabled={pending}
          />
          <span className="mt-2 block text-sm font-normal text-muted">
            En unik kod med små bokstäver, siffror och bindestreck.
          </span>
        </label>
      )}
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
          {pending
            ? "Sparar…"
            : editing
              ? "Spara ändringar"
              : "Skapa företag"}
        </button>
      )}
    </form>
  );
}
