"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { MaterialArrow } from "@/components/material-arrow";
import type { StockData, StockPair } from "./service";

type Scope = { kind: "product" | "location"; id: string; label: string };
type Choice = { id: string; label: string };
export function StockSection({ data, scope, choices, editable, admin }: {
  data: StockData; scope: Scope; choices: Choice[]; editable: boolean; admin: boolean;
}) {
  const [selection, setSelection] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const opener = useRef<HTMLElement | null>(null);
  const router = useRouter();
  function open(id = "") { opener.current = document.activeElement as HTMLElement; setSelection(id); setNotice(""); }
  function close() { setSelection(null); requestAnimationFrame(() => opener.current?.focus()); }
  return <section className="mt-8 border-t border-line/60 pt-6" aria-labelledby={"stock-" + scope.kind}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><h2 id={"stock-" + scope.kind} className="mb-1!">{scope.kind === "product" ? "Lagerplatser och saldo" : "Produkter på platsen"}</h2>
        <p className="text-sm text-muted">{scope.kind === "product" ? "Totalt " + BigInt(data.total).toLocaleString("sv-SE") + " st" : data.items.length + " produkter"}</p>
      </div>
      {editable && <button className="button px-4!" onClick={() => open()}>{scope.kind === "product" ? "+ Lägg på plats" : "+ Lägg till produkt"}</button>}
    </div>
    {notice && <p className="mb-4 text-sm text-cyan" role="status">{notice}</p>}
    {data.items.length ? <ul className="divide-y divide-line/60 overflow-hidden rounded-2xl border border-line bg-surface">
      {data.items.map(row => <li key={row.id} className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <Link className="min-w-0 flex-1" href={scope.kind === "product" ? "/locations/" + row.locationId : "/products/" + row.productId}>
            <p className="break-words font-medium">{scope.kind === "product" ? row.locationCode : row.productName}</p>
            <p className="mt-1 break-words text-xs leading-6 text-muted">{scope.kind === "product" ? row.warehouseName : row.sku}</p>
          </Link>
          <p className="shrink-0 text-xl font-semibold tabular-nums">{row.quantity.toLocaleString("sv-SE")} <span className="text-xs font-normal text-muted">st</span></p>
        </div>
        {!row.active && <p className="mt-2 text-xs text-muted">Inaktiv produkt eller plats</p>}
        {editable && row.active && <button className="mt-2 min-h-13 text-sm text-accent" onClick={() => open(scope.kind === "product" ? row.locationId : row.productId)}>Ändra antal<span className="sr-only"> för {scope.kind === "product" ? row.locationCode : row.productName}</span></button>}
      </li>)}
    </ul> : <p className="rounded-2xl border border-dashed border-line p-5 text-sm leading-7 text-muted">{scope.kind === "product" ? "Produkten har inte placerats på någon lagerplats ännu." : "Det finns inga produkter registrerade på den här platsen."}</p>}
    {admin && <Link className="mt-3 inline-flex min-h-13 items-center gap-2 text-sm text-cyan" href={"/inventory/history?" + (scope.kind === "product" ? "productId=" : "locationId=") + scope.id}>Visa saldohistorik<MaterialArrow /></Link>}
    {selection !== null && <BottomSheet title={selection ? "Ändra antal" : scope.kind === "product" ? "Lägg på lagerplats" : "Lägg till produkt"} onClose={close}>
      <StockEditor scope={scope} choices={choices} initialChoice={selection} onSaved={() => { close(); setNotice("Saldot har sparats."); router.refresh(); }} />
    </BottomSheet>}
  </section>;
}
function StockEditor({ scope, choices, initialChoice, onSaved }: {
  scope: Scope; choices: Choice[]; initialChoice: string; onSaved: () => void;
}) {
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
  useEffect(() => {
    if (!choice) return;
    const controller = new AbortController();
    const params = new URLSearchParams(scope.kind === "product" ? { productId: scope.id, locationId: choice } : { productId: choice, locationId: scope.id });
    fetch("/api/inventory/level?" + params, { signal: controller.signal, cache: "no-store" }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Kunde inte läsa saldot.");
      if (!controller.signal.aborted) { setPair(result.data); setQuantity(String(result.data.quantity)); }
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Kunde inte läsa saldot."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [choice, scope.kind, scope.id, refresh]);
  function reload() { setLoading(true); setPair(null); setError(""); setConflict(false); setRefresh(value => value + 1); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pair || loading || pending || conflict) return;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/inventory", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: pair.productId, locationId: pair.locationId, quantity: Number(quantity), expectedVersion: pair.version, reason }) });
      const result = await response.json();
      if (!response.ok) {
        if (result.error?.code === "STOCK_CONFLICT") setConflict(true);
        throw new Error(result.error?.details?.[0]?.message ?? result.error?.message ?? "Kunde inte spara saldot.");
      }
      onSaved();
    } catch (error) { setError(error instanceof Error ? error.message : "Kunde inte spara saldot."); }
    finally { setPending(false); }
  }
  const matching = choices.filter(item => item.id === choice || item.label.toLocaleLowerCase("sv").includes(search.toLocaleLowerCase("sv")));
  return <form className="space-y-5" onSubmit={submit}>
    <p className="break-words text-sm text-muted">{scope.label}</p>
    {!choices.length ? <p className="text-sm leading-7 text-muted">{scope.kind === "product" ? "Skapa en aktiv lagerplats först." : "Skapa en aktiv produkt först."}</p> : <>
      {!initialChoice && <div className="space-y-4">
        <label>Sök {scope.kind === "product" ? "lagerplats" : "produkt"}<input type="search" value={search} onChange={event => setSearch(event.target.value)} disabled={pending} placeholder="Skriv namn eller kod" /></label>
        <label>{scope.kind === "product" ? "Lagerplats" : "Produkt"}<select required value={choice} onChange={event => { setChoice(event.target.value); setPair(null); setQuantity(""); setError(""); setConflict(false); setLoading(Boolean(event.target.value)); }} disabled={pending}>
          <option value="">Välj {scope.kind === "product" ? "lagerplats" : "produkt"}</option>
          {matching.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}
        </select></label>
        {!matching.length && <p className="text-xs text-muted">Inga träffar. Prova en annan sökning.</p>}
      </div>}
      {initialChoice && <p className="break-words font-medium">{choices.find(item => item.id === initialChoice)?.label}</p>}
      {loading && <p className="text-sm text-muted" role="status">Hämtar aktuellt saldo…</p>}
      {pair && <><p className="rounded-xl bg-canvas p-4 text-sm text-muted">Nuvarande saldo: <strong className="text-foreground">{pair.quantity.toLocaleString("sv-SE")} st</strong></p>
        <label>Nytt antal<input type="number" inputMode="numeric" required min={0} max={Number.MAX_SAFE_INTEGER} step={1} value={quantity} onChange={event => setQuantity(event.target.value)} disabled={pending || conflict} /></label>
        <label>Orsak<input required minLength={2} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="Exempel: Inleverans eller korrigering" disabled={pending} /></label>
        <p className="text-xs leading-6 text-muted">Ange det totala antalet på platsen efter ändringen.</p>
      </>}
      {error && <p className="error" role="alert">{error}</p>}
      {conflict && <button type="button" className="button-secondary w-full" onClick={reload}>Läs in aktuellt saldo</button>}
      {!pair && choice && !loading && error && <button type="button" className="button-secondary w-full" onClick={reload}>Försök igen</button>}
      <button className="button w-full" disabled={!pair || loading || pending || conflict}>{pending ? "Sparar…" : "Spara saldo"}</button>
    </>}
  </form>;
}
