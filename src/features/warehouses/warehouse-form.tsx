"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clientApi } from "@/lib/client-api";
import type { getWarehouse } from "./service";

export function WarehouseForm({
  initial,
  embedded = false,
  id,
  hideSubmit = false,
  onPendingChange,
  onSaved,
}: {
  initial?: Awaited<ReturnType<typeof getWarehouse>>;
  embedded?: boolean;
  id?: string;
  hideSubmit?: boolean;
  onPendingChange?: (pending: boolean) => void;
  onSaved?: (id: string) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    onPendingChange?.(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await clientApi<{ id: string }>(
        initial ? "/api/warehouses/" + initial.id : "/api/warehouses",
        initial ? "PATCH" : "POST",
        {
          name: form.get("name"),
          code: form.get("code"),
          address: form.get("address"),
          ...(initial ? { active: form.get("active") === "on" } : {}),
        },
      );
      if (onSaved) onSaved(result.id);
      else {
        router.push(initial ? "/warehouses" : "/locations?" + new URLSearchParams({ warehouseId: result.id }));
        router.refresh();
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Kunde inte spara lagret.",
      );
    } finally {
      setPending(false);
      onPendingChange?.(false);
    }
  }
  return (
    <form
      id={id}
      onSubmit={submit}
      className={embedded ? "space-y-6" : "editor-form max-w-2xl"}
    >
      <fieldset disabled={pending}>
        <section
          aria-labelledby={embedded ? undefined : "warehouse-information-heading"}
          aria-label={embedded ? "Lageruppgifter" : undefined}
        >
          {!embedded && (
            <h2 id="warehouse-information-heading" className="form-section-heading">
              Lageruppgifter
            </h2>
          )}
          <div
            className={
              embedded
                ? ""
                : "form-card"
            }
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label>
                Lagernamn
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  defaultValue={initial?.name}
                  placeholder="Exempel: Borås lager"
                  autoComplete="organization"
                />
              </label>
              <label>
                Lagerkod
                <input
                  name="code"
                  required
                  maxLength={20}
                  defaultValue={initial?.code}
                  placeholder="BORAS"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
                <span className="mt-2 block text-xs font-normal leading-5 text-muted">
                  Unik kod som sparas med stora bokstäver.
                </span>
              </label>
            </div>

            <label className="mt-5">
              Adress <span className="font-normal text-muted">(valfritt)</span>
              <input
                name="address"
                maxLength={300}
                defaultValue={initial?.address}
                placeholder="Gatuadress och ort"
                autoComplete="street-address"
              />
            </label>

            {initial && (
              <div className="mt-5 border-t border-line/60 pt-5">
                <label className="flex min-h-11 items-center gap-3">
                  <input
                    className="m-0! h-5! min-h-0! w-5! accent-violet-500"
                    type="checkbox"
                    name="active"
                    defaultChecked={initial.active}
                  />
                  Aktivt lager
                </label>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Alla lagerplatser måste vara inaktiva innan lagret kan inaktiveras. Historiken behålls.
                </p>
              </div>
            )}
          </div>
        </section>
      </fieldset>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!hideSubmit && (
        <div className="form-actions">
          <Link
            className="button-secondary w-full sm:w-auto"
            href="/warehouses"
          >
            Avbryt
          </Link>
          <button className="button w-full sm:w-auto" disabled={pending}>
            {pending ? "Sparar…" : initial ? "Spara lager" : "Skapa lager"}
          </button>
        </div>
      )}
    </form>
  );
}
