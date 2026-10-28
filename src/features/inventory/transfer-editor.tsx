"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AppIcon } from "@/components/app-icon";
import type { StockData, StockPair } from "./service";
import type { Choice, EditorActionState, Scope } from "./stock-types";

async function loadPair(productId: string, locationId: string, signal: AbortSignal) {
  const query = new URLSearchParams({ productId, locationId });
  const response = await fetch("/api/inventory/level?" + query, {
    signal,
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error?.message ?? "Kunde inte läsa saldot.");
  return result.data as StockPair;
}

export function TransferEditor({
  scope,
  stock,
  locationChoices,
  onActionStateChange,
  onSaved,
}: {
  scope: Scope;
  stock: StockData;
  locationChoices: Choice[];
  onActionStateChange: (state: EditorActionState) => void;
  onSaved: () => void;
}) {
  const sourceRows = stock.items.filter((row) => row.active);
  const [subjectId, setSubjectId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [sourcePair, setSourcePair] = useState<StockPair | null>(null);
  const [destinationPair, setDestinationPair] = useState<StockPair | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  const selectedRow = sourceRows.find((row) =>
    scope.kind === "product"
      ? row.locationId === subjectId
      : row.productId === subjectId,
  );
  const productId = scope.kind === "product" ? scope.id : subjectId;
  const sourceLocationId =
    scope.kind === "product" ? subjectId : scope.id;
  const destinations = locationChoices.filter(
    (choice) => choice.id !== sourceLocationId,
  );
  const destination = locationChoices.find(
    (choice) => choice.id === destinationId,
  );

  useEffect(() => {
    if (!productId || !sourceLocationId || !destinationId) return;
    const controller = new AbortController();
    Promise.all([
      loadPair(productId, sourceLocationId, controller.signal),
      loadPair(productId, destinationId, controller.signal),
    ])
      .then(([source, destination]) => {
        if (controller.signal.aborted) return;
        setSourcePair(source);
        setDestinationPair(destination);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Kunde inte läsa aktuella saldon.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [productId, sourceLocationId, destinationId, refresh]);

  const zeroPlacement = sourcePair?.quantity === 0;
  const numericQuantity = zeroPlacement ? 0 : Number(quantity);
  const ready = Boolean(
    sourcePair &&
      destinationPair &&
      Number.isSafeInteger(numericQuantity) &&
      (zeroPlacement || numericQuantity >= 1) &&
      numericQuantity <= sourcePair.quantity &&
      reason.trim().length >= 2 &&
      !loading &&
      !pending &&
      !conflict,
  );

  useEffect(() => {
    onActionStateChange({
      disabled: !ready,
      tone: "TRANSFER",
      label: pending
        ? "Flyttar…"
        : zeroPlacement && ready
          ? "Flytta placering"
        : ready
          ? "Flytta " + numericQuantity.toLocaleString("sv-SE") + " st"
          : "Flytta material",
    });
  }, [numericQuantity, onActionStateChange, pending, ready, zeroPlacement]);

  function resetBalances() {
    setSourcePair(null);
    setDestinationPair(null);
    setQuantity("");
    setConflict(false);
    setError("");
    setLoading(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || !sourcePair || !destinationPair) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/inventory/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TRANSFER",
          productId,
          sourceLocationId,
          destinationLocationId: destinationId,
          expectedSourceVersion: sourcePair.version,
          expectedDestinationVersion: destinationPair.version,
          quantity: numericQuantity,
          reason,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (
          result.error?.code === "STOCK_CONFLICT" ||
          result.error?.code === "INSUFFICIENT_STOCK"
        )
          setConflict(true);
        throw new Error(
          result.error?.details?.[0]?.message ??
            result.error?.message ??
            "Materialet kunde inte flyttas.",
        );
      }
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Materialet kunde inte flyttas.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form id="transfer-editor-form" className="space-y-5" onSubmit={submit}>
      <div className="rounded-lg bg-canvas px-4 py-3">
        <p className="text-xs text-muted">
          {scope.kind === "product" ? "Produkt" : "Källplats"}
        </p>
        <p className="mt-1 wrap-break-word text-sm font-medium">{scope.label}</p>
      </div>

      {!sourceRows.length ? (
        <p className="rounded-lg border border-line bg-canvas p-4 text-sm leading-6 text-muted">
          Det finns inga aktiva placeringar att flytta härifrån.
        </p>
      ) : (
        <>
          <label>
            {scope.kind === "product" ? "Från lagerplats" : "Produkt att flytta"}
            <select
              value={subjectId}
              onChange={(event) => {
                setSubjectId(event.target.value);
                setDestinationId("");
                resetBalances();
              }}
              disabled={pending}
              required
            >
              <option value="">Välj alternativ</option>
              {sourceRows.map((row) => (
                <option
                  key={scope.kind === "product" ? row.locationId : row.productId}
                  value={scope.kind === "product" ? row.locationId : row.productId}
                >
                  {scope.kind === "product"
                    ? row.warehouseName + " · " + row.locationCode
                    : row.productName + " · " + row.sku} ({row.quantity.toLocaleString("sv-SE")} st)
                </option>
              ))}
            </select>
          </label>

          <label>
            Till lagerplats
            <select
              value={destinationId}
              onChange={(event) => {
                const nextDestinationId = event.target.value;
                setDestinationId(nextDestinationId);
                resetBalances();
                setLoading(Boolean(nextDestinationId));
              }}
              disabled={!subjectId || pending}
              required
            >
              <option value="">Välj målplats</option>
              {destinations.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.label}
                </option>
              ))}
            </select>
          </label>

          {loading && <p className="text-sm text-muted" role="status">Hämtar aktuella saldon…</p>}
          {sourcePair && destinationPair && selectedRow && destination && (
            <div className="transfer-balance-preview">
              <div>
                <span>{selectedRow.locationCode}</span>
                <strong>{sourcePair.quantity.toLocaleString("sv-SE")} st</strong>
              </div>
              <AppIcon name="transfer" width={22} height={22} />
              <div>
                <span>{destination.label}</span>
                <strong>{destinationPair.quantity.toLocaleString("sv-SE")} st</strong>
              </div>
            </div>
          )}

          {sourcePair && destinationPair && (
            <>
              {zeroPlacement ? (
                <p className="rounded-lg border border-line bg-canvas p-4 text-sm leading-6 text-muted">
                  Placeringen har 0 st och flyttas i sin helhet till den nya lagerplatsen.
                </p>
              ) : (
                <label>
                  Antal att flytta
                  <input
                    type="number"
                    inputMode="numeric"
                    required
                    min={1}
                    max={sourcePair.quantity}
                    step={1}
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    disabled={pending || conflict}
                  />
                </label>
              )}
              <label>
                Kommentar
                <input
                  required
                  minLength={2}
                  maxLength={500}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Exempel: Flytt till plockplats"
                  disabled={pending}
                />
              </label>
              <p className="text-xs leading-6 text-muted">
                En hel flytt tar bort den gamla placeringen. En delflytt lämnar kvar resterande saldo. Flytten sparas i historiken.
              </p>
            </>
          )}
        </>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      {conflict && (
        <button
          type="button"
          className="button-secondary w-full"
          onClick={() => {
            setConflict(false);
            setError("");
            setLoading(true);
            setRefresh((value) => value + 1);
          }}
        >
          Läs in aktuella saldon
        </button>
      )}
    </form>
  );
}
