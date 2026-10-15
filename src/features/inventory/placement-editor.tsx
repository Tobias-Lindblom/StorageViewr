"use client";
import { useEffect, useState, type FormEvent } from "react";
import { clientApi } from "@/lib/client-api";
import type { Scope, Choice, EditorActionState } from "./stock-types";

export function PlacementEditor({
  scope,
  choices,
  onActionStateChange,
  onSaved,
}: {
  scope: Scope;
  choices: Choice[];
  onActionStateChange: (state: EditorActionState) => void;
  onSaved: () => void;
}) {
  const [choice, setChoice] = useState("");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const matching = choices.filter((item) =>
    item.label
      .toLocaleLowerCase("sv")
      .includes(search.toLocaleLowerCase("sv")),
  );
  const visibleChoices = matching.slice(0, 8);
  const selected = choices.find((item) => item.id === choice);

  useEffect(() => {
    onActionStateChange({
      disabled: !choice || pending,
      label: pending ? "Placerar…" : "Placera med 0 st",
    });
  }, [choice, pending, onActionStateChange]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!choice || pending) return;
    setPending(true);
    setError("");
    try {
      await clientApi("/api/inventory/placements", "POST", {
        productId: scope.kind === "product" ? scope.id : choice,
        locationId: scope.kind === "location" ? scope.id : choice,
      });
      onSaved();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Produkten kunde inte placeras.",
      );
      setPending(false);
    }
  }

  return (
    <form id="placement-editor-form" className="space-y-5" onSubmit={submit}>
      <div className="rounded-lg bg-canvas px-4 py-3">
        <p className="text-xs text-muted">
          {scope.kind === "product" ? "Produkt" : "Lagerplats"}
        </p>
        <p className="mt-1 wrap-break-word text-sm font-medium">
          {scope.label}
        </p>
      </div>
      <p className="text-sm leading-6 text-muted">
        Placeringen skapas med 0 st. Inget saldo ändras och ingen
        lagerhändelse registreras.
      </p>
      {!choices.length ? (
        <p className="rounded-lg border border-line bg-canvas p-4 text-sm leading-6 text-muted">
          {scope.kind === "product"
            ? "Produkten är redan placerad på alla aktiva lagerplatser."
            : "Alla aktiva produkter är redan placerade på lagerplatsen."}
        </p>
      ) : !choice ? (
        <div className="space-y-4">
          <label>
            Sök {scope.kind === "product" ? "lagerplats" : "produkt"}
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Skriv namn eller kod"
              disabled={pending}
            />
          </label>
          {visibleChoices.length ? (
            <div>
              <p className="mb-2 text-sm font-medium">
                Välj {scope.kind === "product" ? "lagerplats" : "produkt"}
              </p>
              <div className="max-h-56 overflow-y-auto overscroll-y-contain rounded-lg border border-line bg-canvas">
                {visibleChoices.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex min-h-11 w-full items-center border-b border-line/60 px-4 py-3 text-left text-sm transition last:border-0 hover:bg-surface-raised"
                    onClick={() => setChoice(item.id)}
                    disabled={pending}
                  >
                    <span className="wrap-break-word">{item.label}</span>
                  </button>
                ))}
              </div>
              {matching.length > visibleChoices.length && (
                <p className="mt-2 text-xs text-muted">
                  Skriv mer för att begränsa resultatet.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted">
              Inga träffar. Prova en annan sökning.
            </p>
          )}
        </div>
      ) : (
        <div>
          <p className="mb-2 text-sm font-medium">
            {scope.kind === "product" ? "Lagerplats" : "Produkt"}
          </p>
          <div className="flex min-h-13 items-center justify-between gap-3 rounded-lg border border-line bg-canvas px-4 py-3">
            <span className="min-w-0 wrap-break-word text-sm">
              {selected?.label}
            </span>
            <button
              type="button"
              className="shrink-0 text-sm text-accent"
              onClick={() => setChoice("")}
              disabled={pending}
            >
              Byt
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

