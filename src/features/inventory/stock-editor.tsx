"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { MovementType } from "@/components/quick-actions";
import type { StockPair } from "./service";
import type { Scope, Choice, EditorActionState } from "./stock-types";

export function StockEditor({
  scope,
  initialType,
  choices,
  initialChoice,
  admin,
  onActionStateChange,
  onSaved,
}: {
  scope: Scope;
  choices: Choice[];
  initialChoice: string;
  initialType: MovementType;
  admin: boolean;
  onActionStateChange: (state: EditorActionState) => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<MovementType>(initialType);
  const [choice, setChoice] = useState(initialChoice);
  const [search, setSearch] = useState("");
  const [pair, setPair] = useState<StockPair | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(Boolean(initialChoice));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const productId = scope.kind === "product" ? scope.id : choice;
  const locationId = scope.kind === "product" ? choice : scope.id;

  useEffect(() => {
    if (!productId || !locationId) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ productId, locationId });
    fetch("/api/inventory/level?" + params, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message ?? "Kunde inte läsa saldot.");
        if (!controller.signal.aborted) setPair(result.data);
      })
      .catch(cause => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Kunde inte läsa saldot.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [productId, locationId, refresh]);

  function reload() {
    setLoading(Boolean(productId && locationId));
    setPair(null);
    setError("");
    setConflict(false);
    setRefresh(value => value + 1);
  }

  function selectChoice(nextChoice: string) {
    setChoice(nextChoice);
    setPair(null);
    setQuantity("");
    setError("");
    setConflict(false);
    setLoading(Boolean(nextChoice));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pair || loading || pending || conflict) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/inventory/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          productId: pair.productId,
          locationId: pair.locationId,
          quantity: Number(quantity),
          expectedVersion: pair.version,
          reason,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.error?.code === "STOCK_CONFLICT") setConflict(true);
        throw new Error(result.error?.details?.[0]?.message ?? result.error?.message ?? "Kunde inte registrera lagerhändelsen.");
      }
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Kunde inte registrera lagerhändelsen.");
    } finally {
      setPending(false);
    }
  }

  const matching = choices.filter(item => item.label.toLocaleLowerCase("sv").includes(search.toLocaleLowerCase("sv")));
  const visibleChoices = matching.slice(0, 8);
  const selectedChoice = choices.find(item => item.id === choice);
  const ready = Boolean(pair) && !loading && !pending && !conflict && quantity !== "" && reason.trim().length >= 2;

  useEffect(() => {
    onActionStateChange({
      disabled: !ready,
      tone: type,
      label: pending ? "Registrerar…" : type === "RECEIPT" ? "Registrera inleverans" : "Justera saldo",
    });
  }, [pending, ready, type, onActionStateChange]);

  return <form id="stock-editor-form" className="space-y-5" onSubmit={submit}>
    <div className="rounded-lg bg-canvas px-4 py-3">
      <p className="text-xs text-muted">{scope.kind === "product" ? "Produkt" : "Lagerplats"}</p>
      <p className="mt-1 wrap-break-word text-sm font-medium">{scope.label}</p>
    </div>

    {admin && <fieldset>
      <legend className="mb-2 text-sm font-medium">Händelse</legend>
      <div className="grid grid-cols-2 gap-2" role="radiogroup">
        {([["RECEIPT", "Inleverans"], ["CORRECTION", "Korrigera saldo"]] as const).map(([value, label]) => <button
          key={value} type="button" role="radio" aria-checked={type === value} className="choice-chip"
          onClick={() => { setType(value); setQuantity(""); setError(""); setConflict(false); }} disabled={pending}>
          {label}
        </button>)}
      </div>
    </fieldset>}

    {!choices.length ? <p className="text-sm leading-7 text-muted">
      {scope.kind === "product" ? "Skapa en aktiv lagerplats först." : "Skapa en aktiv produkt först."}
    </p> : <>
      {!choice && <div className="space-y-4">
        <label>Sök {scope.kind === "product" ? "lagerplats" : "produkt"}
          <input type="search" value={search} onChange={event => setSearch(event.target.value)} disabled={pending} placeholder="Skriv namn eller kod" />
        </label>
        {visibleChoices.length ? <div>
          <p className="mb-2 text-sm font-medium">Välj {scope.kind === "product" ? "lagerplats" : "produkt"}</p>
          <div className="max-h-56 overflow-y-auto overscroll-y-contain rounded-lg border border-line bg-canvas">
            {visibleChoices.map(item => <button key={item.id} type="button"
              className="flex min-h-11 w-full items-center border-b border-line/60 px-4 py-3 text-left text-sm transition last:border-0 hover:bg-surface-raised"
              onClick={() => selectChoice(item.id)} disabled={pending}><span className="wrap-break-word">{item.label}</span></button>)}
          </div>
          {matching.length > visibleChoices.length && <p className="mt-2 text-xs text-muted">Skriv mer för att begränsa resultatet.</p>}
        </div> : <p className="text-xs text-muted">Inga träffar. Prova en annan sökning.</p>}
      </div>}
      {choice && selectedChoice && <div>
        <p className="mb-2 text-sm font-medium">{scope.kind === "product" ? "Lagerplats" : "Produkt"}</p>
        <div className="flex min-h-13 items-center justify-between gap-3 rounded-lg border border-line bg-canvas px-4 py-3">
          <span className="min-w-0 wrap-break-word text-sm">{selectedChoice.label}</span>
          {!initialChoice && <button type="button" className="shrink-0 text-sm text-accent" onClick={() => selectChoice("")} disabled={pending}>Byt</button>}
        </div>
      </div>}
      {loading && <p className="text-sm text-muted" role="status">Hämtar registrerat saldo…</p>}
      {pair && <>
        <p className="rounded-lg bg-canvas p-4 text-sm text-muted">Registrerat saldo: <strong className="text-foreground">{pair.quantity.toLocaleString("sv-SE")} st</strong></p>
        <label>{type === "RECEIPT" ? "Antal att lägga till" : "Nytt registrerat saldo"}
          <input type="number" inputMode="numeric" required min={type === "CORRECTION" ? 0 : 1} max={Number.MAX_SAFE_INTEGER} step={1}
            value={quantity} onChange={event => setQuantity(event.target.value)} disabled={pending || conflict} />
        </label>
        <label>Kommentar
          <input required minLength={2} maxLength={500} value={reason} onChange={event => setReason(event.target.value)}
            placeholder={type === "CORRECTION" ? "Beskriv varför saldot korrigeras" : "Exempel: Leverans från leverantör"} disabled={pending} />
        </label>
        {type === "CORRECTION" && <p className="text-xs leading-6 text-muted">Det nya saldot ersätter det registrerade saldot. Korrigeringen sparas i historiken.</p>}
      </>}
      {error && <p className="error" role="alert">{error}</p>}
      {conflict && <button type="button" className="button-secondary w-full" onClick={reload}>Läs in aktuellt saldo</button>}
      {!pair && choice && !loading && error && <button type="button" className="button-secondary w-full" onClick={reload}>Försök igen</button>}
    </>}
  </form>;
}
