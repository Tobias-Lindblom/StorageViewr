"use client";
import { useState, type FormEvent } from "react";
import { clientApi } from "@/lib/client-api";
import type { InventoryPlace } from "./session-queries";

type Row = { productId: string; productName: string; sku: string; currentQuantity: number; currentVersion: number | null; value: string };
type Choice = { id: string; name: string; sku: string };
export function CountPlace({ inventoryId, place, reload, onSaved }: {
  inventoryId: string; place: InventoryPlace; reload: () => Promise<unknown>; onSaved: () => Promise<void>;
}) {
  const [rows, setRows] = useState<Row[]>(() => place.rows.map(row => ({ ...row, value: row.countedQuantity === null ? "" : String(row.countedQuantity) })));
  const [confirmed, setConfirmed] = useState(false);
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [search, setSearch] = useState("");
  const [choices, setChoices] = useState<Choice[]>([]);
  const [searched, setSearched] = useState(false);
  const recount = place.status === "counted";
  async function findProducts() {
    setBusy(true); setError("");
    try {
      const result = await clientApi<{ items: Choice[] }>("/api/products?" + new URLSearchParams({ q: search, status: "active" }), "GET");
      setChoices(result.items.filter(item => !rows.some(row => row.productId === item.id))); setSearched(true);
    } catch (error) { setError(error instanceof Error ? error.message : "Kunde inte söka."); }
    finally { setBusy(false); }
  }
  async function addProduct(choice: Choice) {
    setBusy(true); setError("");
    try {
      const pair = await clientApi<{ quantity: number; version: number | null }>("/api/inventory/level?" + new URLSearchParams({ productId: choice.id, locationId: place.id }), "GET");
      setRows(current => [...current, { productId: choice.id, productName: choice.name, sku: choice.sku, currentQuantity: pair.quantity, currentVersion: pair.version, value: "" }]);
      setChoices([]); setSearch(""); setSearched(false); setConfirmed(false);
    } catch (error) { setError(error instanceof Error ? error.message : "Kunde inte lägga till produkten."); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/inventory/sessions/" + inventoryId + "/count/" + place.id, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: place.revision, confirmReplace: replace, confirmComplete: confirmed,
          rows: rows.map(row => ({ productId: row.productId, expectedVersion: row.currentVersion, countedQuantity: Number(row.value) })) }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) setConflict(true);
        throw new Error(result.error?.details?.[0]?.message ?? result.error?.message ?? "Räkningen kunde inte sparas.");
      }
      await onSaved();
    } catch (error) { setError(error instanceof Error ? error.message : "Räkningen kunde inte sparas."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className="space-y-5">
    <p className="text-sm leading-7 text-muted">Ange faktiskt antal för varje produkt. Inga saldon ändras när du sparar räkningen.</p>
    {place.stale && <p className="rounded-xl border border-amber-200/30 p-3 text-sm text-amber-200">Saldot har ändrats sedan förra räkningen. Kontrollera antal mot aktuellt saldo nedan.</p>}
    <fieldset disabled={busy || conflict} className="space-y-4">
      <legend className="sr-only">Produkter att räkna</legend>
      {rows.length ? rows.map(row => <div key={row.productId} className="rounded-xl border border-line bg-canvas p-4">
        <p className="break-words font-semibold">{row.productName}</p>
        <p className="mt-1 text-xs text-muted">{row.sku} · Aktuellt saldo {row.currentQuantity.toLocaleString("sv-SE")} st</p>
        <label className="mt-4">Räknat antal<span className="sr-only"> {row.productName}</span><input type="number" inputMode="numeric" min={0} max={Number.MAX_SAFE_INTEGER} step={1} required value={row.value}
          onChange={event => { setRows(current => current.map(item => item.productId === row.productId ? { ...item, value: event.target.value } : item)); setConfirmed(false); }} /></label>
        {row.value !== "" && Number.isSafeInteger(Number(row.value)) && Number(row.value) >= 0 && <p className="mt-2 text-xs text-accent">Avvikelse: {(Number(row.value) - row.currentQuantity).toLocaleString("sv-SE")} st</p>}
      </div>) : <p className="rounded-xl border border-dashed border-line p-4 text-sm leading-7 text-muted">Inga produkter finns registrerade här. Bekräfta att platsen är tom, eller lägg till en produkt du hittat.</p>}
      <details className="rounded-xl border border-line p-4">
        <summary className="cursor-pointer text-sm text-cyan">Hittat en annan produkt?</summary>
        <label className="mt-4">Sök produkt<input value={search} maxLength={100} placeholder="Namn eller artikelnummer" onChange={event => { setSearch(event.target.value); setSearched(false); setChoices([]); }} /></label>
        <button type="button" className="button-secondary mt-3 w-full" onClick={findProducts}>Sök produkter</button>
        <ul>{choices.map(choice => <li key={choice.id}><button type="button" className="mt-2 min-h-13 w-full rounded-lg px-2 py-3 text-left text-sm hover:bg-surface-raised" onClick={() => addProduct(choice)}>{choice.name}<span className="ml-2 text-xs text-muted">{choice.sku}</span><span className="block text-xs text-cyan">Lägg till i räkningen</span></button></li>)}</ul>
        {searched && <p className="mt-3 text-xs text-muted">{choices.length ? "Visar upp till 24 träffar. Sök mer specifikt vid behov." : "Inga fler matchande produkter hittades."}</p>}
      </details>
      {recount && <label className="flex min-h-13 items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1! h-4! min-h-0! w-4! shrink-0 px-0! accent-violet-500" checked={replace} onChange={event => setReplace(event.target.checked)} /><span>Ersätt den tidigare räkningen på den här platsen.</span></label>}
      <label className="flex min-h-13 items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1! h-4! min-h-0! w-4! shrink-0 px-0! accent-violet-500" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /><span>{rows.length ? "Alla produkter på platsen är räknade och antalen kontrollerade." : "Jag har kontrollerat att platsen är tom."}</span></label>
    </fieldset>
    {error && <p role="alert" className="text-sm text-rose-200">{error}</p>}
    {conflict && <button type="button" className="button-secondary w-full" disabled={busy} onClick={async () => { setBusy(true); try { await reload(); } catch { setError("Kunde inte läsa in platsen. Försök igen."); setBusy(false); } }}>Läs in platsen igen</button>}
    <button className="button w-full" disabled={busy || conflict || !confirmed || (recount && !replace)}>{busy ? "Sparar…" : "Bekräfta och spara plats"}</button>
  </form>;
}
