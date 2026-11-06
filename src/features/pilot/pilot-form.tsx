"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { AppIcon } from "@/components/app-icon";
import { MaterialArrow } from "@/components/material-arrow";
import { clientApi } from "@/lib/client-api";
import {
  pilotBusinessTypes,
  pilotCurrentSystems,
  pilotLocationRanges,
  pilotNeeds,
  pilotProductRanges,
  pilotRequestSchema,
} from "@/validation/pilot-request";
import { pilotContact } from "@/lib/pilot-contact";
import { PilotTerms } from "./pilot-terms";
import styles from "./pilot-page.module.css";

type PilotNeed = (typeof pilotNeeds)[number];
type FieldErrors = Record<string, string>;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span id={id} className={styles.fieldError}>
      {message}
    </span>
  );
}

export function PilotForm() {
  const [selectedNeeds, setSelectedNeeds] = useState<PilotNeed[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const submittingRef = useRef(false);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!success) return;
    const heading = successHeadingRef.current;
    heading?.focus();
    heading?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
    });
  }, [success]);

  function toggleNeed(need: PilotNeed) {
    if (pending) return;
    setSelectedNeeds((current) =>
      current.includes(need)
        ? current.filter((value) => value !== need)
        : [...current, need],
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const value = (name: string) => String(form.get(name) ?? "");
    const result = pilotRequestSchema.safeParse({
      name: value("name"),
      companyName: value("companyName"),
      email: value("email"),
      phone: value("phone"),
      businessType: value("businessType"),
      productRange: value("productRange"),
      locationRange: value("locationRange"),
      currentSystem: value("currentSystem"),
      needs: selectedNeeds,
      description: value("description"),
      website: value("website"),
    });

    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0] ?? "form");
        errors[field] ??= issue.message;
      }
      setFieldErrors(errors);
      setSubmitError("");
      const firstField = String(result.error.issues[0]?.path[0] ?? "");
      const target = formElement.elements.namedItem(firstField);
      if (target instanceof HTMLElement) target.focus();
      return;
    }

    submittingRef.current = true;
    setPending(true);
    setFieldErrors({});
    setSubmitError("");
    try {
      await clientApi<{ received: true }>(
        "/api/pilot-requests",
        "POST",
        result.data,
      );
      setSuccess(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setSubmitError(
        message.startsWith("För många") ||
          message.startsWith("Ange ") ||
          message.startsWith("Välj ")
          ? message
          : "Något gick fel när förfrågan skickades. Försök igen.",
      );
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  }

  if (success) {
    return (
      <div id="pilot-form" className={styles.successState} role="status">
        <span className={styles.successIcon} aria-hidden="true">
          <AppIcon name="verified" width={32} height={32} />
        </span>
        <h2 ref={successHeadingRef} tabIndex={-1}>
          Tack — vi har fått er pilotförfrågan.
        </h2>
        <p>
          Tobias Lindblom går igenom informationen och återkommer
          till den e-postadress ni angav inom 24 timmar.
        </p>
        <p>
          Detta är er mottagningsbekräftelse; inget automatiskt bekräftelsemejl skickas.
          Under tiden behöver ni inte skapa något konto.
        </p>
        <p>
          Frågor? <a href={"mailto:" + pilotContact.email}>Kontakta Tobias Lindblom</a>.
        </p>
        <Link href="/" className={`button ${styles.successAction}`}>
          Tillbaka till StorageViewr
          <MaterialArrow name="forward" />
        </Link>
      </div>
    );
  }

  const errorProps = (name: string) => ({
    "aria-invalid": fieldErrors[name] ? (true as const) : undefined,
    "aria-describedby": fieldErrors[name]
      ? `pilot-${name}-error`
      : undefined,
  });

  return (
    <form id="pilot-form" className={styles.form} action="/api/pilot-requests"
      method="post" onSubmit={submit} noValidate tabIndex={-1}>
      <noscript>
        <p data-noscript-message className={styles.submitError}>
          Aktivera JavaScript för att skicka formuläret, eller kontakta oss på{" "}
          <a href={"mailto:" + pilotContact.email}>tobiasmagnuslindblom@gmail.com</a>.
        </p>
      </noscript>
      <header className={styles.formHeader}>
        <h2>Ansök om pilot</h2>
        <p>Sex obligatoriska uppgifter. Övriga fält är valfria.</p>
      </header>

      <div className={styles.fieldGrid}>
        <label>
          <span className={styles.fieldLabel}>
            Namn <span aria-hidden="true">*</span>
          </span>
          <input
            name="name"
            autoComplete="name"
            placeholder="För- och efternamn"
            minLength={2}
            maxLength={100}
            required
            disabled={pending}
            {...errorProps("name")}
          />
          <FieldError id="pilot-name-error" message={fieldErrors.name} />
        </label>
        <label>
          <span className={styles.fieldLabel}>
            Företag <span aria-hidden="true">*</span>
          </span>
          <input
            name="companyName"
            autoComplete="organization"
            placeholder="Ditt företag"
            minLength={2}
            maxLength={140}
            required
            disabled={pending}
            {...errorProps("companyName")}
          />
          <FieldError
            id="pilot-companyName-error"
            message={fieldErrors.companyName}
          />
        </label>
        <label>
          <span className={styles.fieldLabel}>
            E-post <span aria-hidden="true">*</span>
          </span>
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="namn@foretag.se"
            maxLength={254}
            spellCheck={false}
            required
            disabled={pending}
            {...errorProps("email")}
          />
          <FieldError id="pilot-email-error" message={fieldErrors.email} />
        </label>
        <label>
          <span className={styles.fieldLabel}>
            Telefon <span className={styles.optional}>(valfritt)</span>
          </span>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="070 123 45 67"
            maxLength={40}
            disabled={pending}
            {...errorProps("phone")}
          />
          <FieldError id="pilot-phone-error" message={fieldErrors.phone} />
        </label>
      </div>

      <fieldset className={styles.formSection}>
        <legend>Om ert lager</legend>
        <div className={styles.fieldGrid}>
          <label>
            <span className={styles.fieldLabel}>
              Vilken typ av verksamhet har ni? <span aria-hidden="true">*</span>
            </span>
            <select
              name="businessType"
              defaultValue=""
              required
              disabled={pending}
              {...errorProps("businessType")}
            >
              <option value="" disabled>
                Välj verksamhetstyp
              </option>
              {pilotBusinessTypes.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <FieldError
              id="pilot-businessType-error"
              message={fieldErrors.businessType}
            />
          </label>
          <label>
            <span className={styles.fieldLabel}>
              Ungefär hur många produkter har ni? <span aria-hidden="true">*</span>
            </span>
            <select
              name="productRange"
              defaultValue=""
              required
              disabled={pending}
              {...errorProps("productRange")}
            >
              <option value="" disabled>
                Välj intervall
              </option>
              {pilotProductRanges.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <FieldError
              id="pilot-productRange-error"
              message={fieldErrors.productRange}
            />
          </label>
          <label>
            <span className={styles.fieldLabel}>
              Ungefär hur många lagerplatser har ni? <span aria-hidden="true">*</span>
            </span>
            <select
              name="locationRange"
              defaultValue=""
              required
              disabled={pending}
              {...errorProps("locationRange")}
            >
              <option value="" disabled>
                Välj intervall
              </option>
              {pilotLocationRanges.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <FieldError
              id="pilot-locationRange-error"
              message={fieldErrors.locationRange}
            />
          </label>
          <label>
            <span className={styles.fieldLabel}>
              Hur håller ni koll på lagret idag?
            </span>
            <select
              name="currentSystem"
              defaultValue=""
              disabled={pending}
              {...errorProps("currentSystem")}
            >
              <option value="">Välj alternativ</option>
              {pilotCurrentSystems.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <FieldError
              id="pilot-currentSystem-error"
              message={fieldErrors.currentSystem}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className={styles.formSection}>
        <legend>Vad vill ni få bättre kontroll på?</legend>
        <div className={styles.needGrid}>
          {pilotNeeds.map((need) => {
            const selected = selectedNeeds.includes(need);
            return (
              <button
                key={need}
                type="button"
                role="checkbox"
                aria-checked={selected}
                className={styles.needChoice}
                disabled={pending}
                onClick={() => toggleNeed(need)}
              >
                <span className={styles.needCheck} aria-hidden="true">
                  {selected && <AppIcon name="check" width={14} height={14} />}
                </span>
                {need}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className={styles.descriptionField}>
        <span className={styles.fieldLabel}>
          Berätta gärna kort om ert lager
        </span>
        <textarea
          name="description"
          rows={4}
          maxLength={1_200}
          disabled={pending}
          placeholder="Vi har cirka 500 produkter på 80 lagerplatser och vill framför allt förenkla inventeringen och få bättre kontroll på buffertlagret."
          {...errorProps("description")}
        />
        <FieldError
          id="pilot-description-error"
          message={fieldErrors.description}
        />
      </label>

      <label className={styles.honeypot} aria-hidden="true">
        Lämna detta fält tomt
        <input
          name="website"
          type="text"
          autoComplete="off"
          tabIndex={-1}
          disabled={pending}
        />
      </label>

      <PilotTerms />
      <p className={styles.privacyNote}>
        {pilotContact.name} använder uppgifterna för att besvara och följa upp
        din förfrågan. Den raderas 90 dagar efter senaste kontakt.{" "}
        <Link href="/integritet">Så behandlas dina personuppgifter</Link>.
      </p>
      {submitError && (
        <p className={styles.submitError} role="alert">
          {submitError}
        </p>
      )}

      <button className={`button ${styles.submitButton}`} disabled={pending}>
        {pending ? "Skickar förfrågan…" : "Skicka pilotförfrågan"}
        {!pending && <MaterialArrow name="forward" />}
      </button>
      <p className={styles.submitNote}>
        Obindande förfrågan. Svar inom 24 timmar. Pris och testperiod bestäms före start.
      </p>
    </form>
  );
}

