"use client";
import { useState, type FormEvent } from "react";
import { AppIcon } from "@/components/app-icon";
import { MaterialArrow } from "@/components/material-arrow";
import { InventoryScanner } from "@/features/scanner/inventory-scanner";
import { clientApi } from "@/lib/client-api";
import type { InventoryPlace } from "./session-queries";

type Row = {
  productId: string;
  productName: string;
  sku: string;
  currentQuantity: number;
  currentVersion: number | null;
  value: string;
};
type Choice = { id: string; name: string; sku: string };
export function CountPlace({
  inventoryId,
  place,
  verified,
  onVerified,
  reload,
  onSaved,
}: {
  inventoryId: string;
  place: InventoryPlace;
  verified: boolean;
  onVerified: () => void;
  reload: () => Promise<unknown>;
  onSaved: () => Promise<void>;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    place.rows.map((row) => ({
      ...row,
      value: row.countedQuantity === null ? "" : String(row.countedQuantity),
    })),
  );
  const [snapshot, setSnapshot] = useState(place);
  const [scanning, setScanning] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [search, setSearch] = useState("");
  const [choices, setChoices] = useState<Choice[]>([]);
  const [searched, setSearched] = useState(false);
  const recount = snapshot.status === "counted";
  async function findProducts() {
    setBusy(true);
    setError("");
    try {
      const result = await clientApi<{ items: Choice[] }>(
        "/api/products?" + new URLSearchParams({ q: search, status: "active" }),
        "GET",
      );
      setChoices(
        result.items.filter(
          (item) => !rows.some((row) => row.productId === item.id),
        ),
      );
      setSearched(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Kunde inte söka.");
    } finally {
      setBusy(false);
    }
  }
  async function addProduct(choice: Choice) {
    setBusy(true);
    setError("");
    try {
      const pair = await clientApi<{
        quantity: number;
        version: number | null;
      }>(
        "/api/inventory/level?" +
          new URLSearchParams({ productId: choice.id, locationId: place.id }),
        "GET",
      );
      setRows((current) => [
        ...current,
        {
          productId: choice.id,
          productName: choice.name,
          sku: choice.sku,
          currentQuantity: pair.quantity,
          currentVersion: pair.version,
          value: "",
        },
      ]);
      setChoices([]);
      setSearch("");
      setSearched(false);
      setConfirmed(false);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Kunde inte lägga till produkten.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verified || scanning) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        "/api/inventory/sessions/" + inventoryId + "/count/" + place.id,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedRevision: snapshot.revision,
            confirmReplace: replace,
            confirmComplete: confirmed,
            rows: rows.map((row) => ({
              productId: row.productId,
              expectedVersion: row.currentVersion,
              countedQuantity: Number(row.value),
            })),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) setConflict(true);
        throw new Error(
          result.error?.details?.[0]?.message ??
            result.error?.message ??
            "Räkningen kunde inte sparas.",
        );
      }
      await onSaved();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Räkningen kunde inte sparas.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {!verified && !scanning && (
        <section aria-labelledby="verify-location-heading">
          <div className="flex items-start gap-4 rounded-2xl border border-line bg-canvas p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-accent">
              <AppIcon name="qr" />
            </span>
            <div className="min-w-0">
              <h3 id="verify-location-heading" className="mb-1! text-base!">
                Verifiera lagerplatsen
              </h3>
              <p className="text-sm leading-6 text-muted">
                Skanna etiketten på <strong className="font-medium text-foreground">{place.code}</strong>. Produkterna visas när platsen har verifierats.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="button mt-5 w-full"
            onClick={() => setScanning(true)}
          >
            <AppIcon name="qr" />
            Skanna platsens QR-kod
          </button>
          <p className="mt-3 text-center text-xs leading-5 text-muted">
            Kameran öppnas i nästa steg. Platskoden kan även anges manuellt.
          </p>
        </section>
      )}
      {scanning && (
        <div className="space-y-4">
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-accent"
            onClick={() => setScanning(false)}
          >
            <MaterialArrow name="back" />
            {verified ? "Tillbaka till räkningen" : "Tillbaka"}
          </button>
          <InventoryScanner
            inventoryId={inventoryId}
            locationId={place.id}
            locationCode={place.code}
            onResolved={(result) => {
              const latest = result.inventory.places.find(
                (item) => item.id === place.id,
              )!;
              setSnapshot(latest);
              onVerified();
              setRows((current) => {
                const existing = new Map(
                  current.map((row) => [row.productId, row]),
                );
                const refreshed = latest.rows.map((row) => ({
                  ...row,
                  value:
                    existing.get(row.productId)?.value ??
                    (row.countedQuantity === null
                      ? ""
                      : String(row.countedQuantity)),
                }));
                return [
                  ...refreshed,
                  ...current.filter(
                    (row) =>
                      !latest.rows.some(
                        (item) => item.productId === row.productId,
                      ),
                  ),
                ];
              });
              setConfirmed(false);
              setReplace(false);
              setConflict(false);
              setError("");
              setScanning(false);
            }}
          />
        </div>
      )}
      {verified && (
        <form onSubmit={save} className={scanning ? "hidden" : ""}>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3">
            <p
              role="status"
              className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400"
            >
              <AppIcon name="check" className="shrink-0" />
              Lagerplats verifierad
            </p>
            <button
              type="button"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm text-accent"
              disabled={busy}
              onClick={() => setScanning(true)}
            >
              <AppIcon name="qr" />
              Skanna igen
            </button>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            Ange faktiskt antal för varje produkt. Saldot ändras först när hela inventeringen genomförs.
          </p>
          {snapshot.stale && (
            <p className="mt-4 rounded-xl border border-amber-200/30 bg-amber-200/5 p-4 text-sm leading-6 text-amber-200">
              Saldot har ändrats sedan förra räkningen. Kontrollera antal mot
              aktuellt saldo nedan.
            </p>
          )}
          <fieldset disabled={busy || conflict} className="mt-6">
            <legend className="sr-only">Produkter att räkna</legend>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">Produkter</h3>
              <span className="text-xs text-muted">
                {rows.length} {rows.length === 1 ? "produkt" : "produkter"}
              </span>
            </div>
            {rows.length ? (
              <div className="overflow-hidden rounded-2xl border border-line bg-surface">
                {rows.map((row) => {
                  const valid =
                    row.value !== "" &&
                    Number.isSafeInteger(Number(row.value)) &&
                    Number(row.value) >= 0;
                  const difference = valid
                    ? Number(row.value) - row.currentQuantity
                    : 0;
                  return (
                    <div key={row.productId} className="border-b border-line/60 p-4 last:border-0 sm:p-5">
                      <p className="wrap-break-word font-semibold">{row.productName}</p>
                      <p className="mt-1 text-xs text-muted">
                        {row.sku} · Aktuellt saldo {row.currentQuantity.toLocaleString("sv-SE")} st
                      </p>
                      <label className="mt-4">
                        Räknat antal
                        <span className="sr-only"> {row.productName}</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={Number.MAX_SAFE_INTEGER}
                          step={1}
                          required
                          value={row.value}
                          onChange={(event) => {
                            setRows((current) =>
                              current.map((item) =>
                                item.productId === row.productId
                                  ? { ...item, value: event.target.value }
                                  : item,
                              ),
                            );
                            setConfirmed(false);
                          }}
                        />
                      </label>
                      {valid && (
                        <p
                          className={
                            "mt-2 text-xs " +
                            (difference < 0
                              ? "text-rose-200"
                              : difference > 0
                                ? "text-cyan"
                                : "text-muted")
                          }
                        >
                          {difference === 0
                            ? "Ingen avvikelse"
                            : "Avvikelse " + (difference > 0 ? "+" : "") + difference.toLocaleString("sv-SE") + " st"}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-2xl border border-line bg-surface p-5 text-sm leading-6 text-muted">
                Inga produkter finns registrerade här. Bekräfta att platsen är
                tom, eller lägg till en produkt du hittat.
              </p>
            )}
            <details className="group mt-4 overflow-hidden rounded-xl border border-line bg-surface">
              <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm text-cyan">
                Lägg till hittad produkt
                <MaterialArrow name="expand" size={18} className="transition group-open:rotate-180" />
              </summary>
              <div className="border-t border-line/60 p-4">
                <label>
                  Sök produkt
                  <input
                    value={search}
                    maxLength={100}
                    placeholder="Namn eller artikelnummer"
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setSearched(false);
                      setChoices([]);
                    }}
                  />
                </label>
                <button type="button" className="button-secondary mt-3 w-full" onClick={findProducts}>
                  Sök produkter
                </button>
                {choices.length > 0 && (
                  <ul className="mt-3 overflow-hidden rounded-xl border border-line bg-canvas">
                    {choices.map((choice) => (
                      <li key={choice.id} className="border-b border-line/60 last:border-0">
                        <button
                          type="button"
                          className="min-h-14 w-full px-4 py-3 text-left text-sm transition hover:bg-surface-raised"
                          onClick={() => addProduct(choice)}
                        >
                          <span className="block font-medium">{choice.name}</span>
                          <span className="mt-1 block text-xs text-muted">{choice.sku}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {searched && (
                  <p className="mt-3 text-xs text-muted">
                    {choices.length
                      ? "Visar upp till 24 träffar. Sök mer specifikt vid behov."
                      : "Inga fler matchande produkter hittades."}
                  </p>
                )}
              </div>
            </details>
            {recount && (
              <label className="mt-4 flex min-h-13 items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm leading-6">
                <input
                  type="checkbox"
                  className="mt-1! h-4! min-h-0! w-4! shrink-0 px-0! accent-violet-500"
                  checked={replace}
                  onChange={(event) => setReplace(event.target.checked)}
                />
                <span>Ersätt den tidigare räkningen på den här platsen.</span>
              </label>
            )}
            <label className="mt-4 flex min-h-13 items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm leading-6">
              <input
                type="checkbox"
                className="mt-1! h-4! min-h-0! w-4! shrink-0 px-0! accent-violet-500"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>
                {rows.length
                  ? "Alla produkter på platsen är räknade och antalen kontrollerade."
                  : "Jag har kontrollerat att platsen är tom."}
              </span>
            </label>
          </fieldset>
          {error && (
            <p role="alert" className="error mt-4">
              {error}
            </p>
          )}
          {conflict && (
            <button
              type="button"
              className="button-secondary mt-4 w-full"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await reload();
                } catch {
                  setError("Kunde inte läsa in platsen. Försök igen.");
                  setBusy(false);
                }
              }}
            >
              Läs in platsen igen
            </button>
          )}
          <div className="mt-6 border-t border-line/60 pt-5">
            <button
              className="button w-full"
              disabled={busy || conflict || !confirmed || (recount && !replace)}
            >
              {busy ? "Sparar…" : "Bekräfta och spara plats"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
