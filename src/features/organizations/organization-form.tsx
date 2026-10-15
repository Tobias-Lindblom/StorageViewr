"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client-api";
import type { OrganizationDocumentDetails } from "./types";
export function OrganizationForm({
  name,
  details,
  id,
  hideSubmit = false,
  onPendingChange,
  compact = false,
}: {
  name?: string;
  details?: Partial<OrganizationDocumentDetails>;
  id?: string;
  hideSubmit?: boolean;
  onPendingChange?: (pending: boolean) => void;
  compact?: boolean;
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
          ...(!editing ? { slug: form.get("slug") } : {
            organizationNumber: form.get("organizationNumber"),
            addressLine1: form.get("addressLine1"),
            addressLine2: form.get("addressLine2"),
            postalCode: form.get("postalCode"),
            city: form.get("city"),
            country: form.get("country"),
            contactEmail: form.get("contactEmail"),
            phone: form.get("phone"),
            website: form.get("website"),
          }),
        },
      );
      if (!editing) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setMessage("Företagsuppgifterna har sparats.");
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
    <form id={id} onSubmit={submit} className={compact ? "organization-create-form" : "space-y-6"}>
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
      {editing && <>
        <fieldset className="organization-details-section">
          <legend>Företagsidentitet</legend>
          <p>Juridiska uppgifter som kan visas på rapporter och andra dokument.</p>
          <label>
            Organisationsnummer
            <input name="organizationNumber" defaultValue={details?.organizationNumber}
              maxLength={32} inputMode="numeric" placeholder="556016-0680" disabled={pending} />
          </label>
        </fieldset>

        <fieldset className="organization-details-section">
          <legend>Postadress</legend>
          <div className="organization-fields">
            <label className="organization-field-wide">
              Adress
              <input name="addressLine1" defaultValue={details?.addressLine1}
                maxLength={160} autoComplete="address-line1" placeholder="Gatuadress 1" disabled={pending} />
            </label>
            <label className="organization-field-wide">
              Adressrad 2 <span>(valfritt)</span>
              <input name="addressLine2" defaultValue={details?.addressLine2}
                maxLength={160} autoComplete="address-line2" placeholder="C/o, våning eller avdelning" disabled={pending} />
            </label>
            <label>
              Postnummer
              <input name="postalCode" defaultValue={details?.postalCode}
                maxLength={16} inputMode="numeric" autoComplete="postal-code" placeholder="123 45" disabled={pending} />
            </label>
            <label>
              Postort
              <input name="city" defaultValue={details?.city}
                maxLength={100} autoComplete="address-level2" placeholder="Stockholm" disabled={pending} />
            </label>
            <label className="organization-field-wide">
              Land
              <input name="country" defaultValue={details?.country}
                maxLength={80} autoComplete="country-name" placeholder="Sverige" disabled={pending} />
            </label>
          </div>
        </fieldset>

        <fieldset className="organization-details-section">
          <legend>Kontaktuppgifter</legend>
          <div className="organization-fields">
            <label>
              E-post
              <input type="email" name="contactEmail" defaultValue={details?.contactEmail}
                maxLength={254} autoComplete="email" placeholder="info@foretag.se" disabled={pending} />
            </label>
            <label>
              Telefon
              <input type="tel" name="phone" defaultValue={details?.phone}
                maxLength={40} autoComplete="tel" placeholder="08-123 45 67" disabled={pending} />
            </label>
            <label className="organization-field-wide">
              Webbplats
              <input type="url" name="website" defaultValue={details?.website}
                maxLength={200} autoComplete="url" placeholder="https://foretag.se" disabled={pending} />
            </label>
          </div>
        </fieldset>
      </>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="notice notice-success"
        >
          {message}
        </p>
      )}
      {!hideSubmit && (
        <button className={compact ? "organization-primary-action organization-create-submit" : "button w-full sm:w-auto"} disabled={pending}>
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
