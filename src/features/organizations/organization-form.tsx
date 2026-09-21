"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client-api";
export function OrganizationForm({ name }: { name?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const editing = name !== undefined;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await clientApi(editing ? "/api/organization" : "/api/organizations", editing ? "PATCH" : "POST",
        { name: form.get("name"), ...(!editing ? { slug: form.get("slug") } : {}) });
      if (!editing) { router.push("/dashboard"); router.refresh(); }
      else { setMessage("Företagsnamnet har sparats."); router.refresh(); }
    } catch (error) { setError(error instanceof Error ? error.message : "Försök igen."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="space-y-5">
    <label>Företagsnamn<input name="name" defaultValue={name} minLength={2} maxLength={100} required autoComplete="organization" /></label>
    {!editing && <label>Företagskod<input name="slug" required minLength={3} maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="mitt-foretag" /><span className="mt-2 block text-sm font-normal text-muted">En unik kod med små bokstäver, siffror och bindestreck.</span></label>}
    {error && <p role="alert" className="error">{error}</p>}
    {message && <p role="status" className="text-cyan">{message}</p>}
    <button className="button" disabled={pending}>{pending ? "Sparar…" : editing ? "Spara ändringar" : "Skapa företag"}</button>
  </form>;
}
