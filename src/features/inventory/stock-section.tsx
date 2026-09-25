"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { MaterialArrow } from "@/components/material-arrow";
import type { StockData, StockPair } from "./service";

type Scope = { kind: "product" | "location"; id: string; label: string };
type Choice = { id: string; label: string };
type MovementType = "RECEIPT" | "ISSUE" | "TRANSFER" | "CORRECTION";
export function StockSection({
  data,
  scope,
  choices,
  transferLocations,
  operable,
  admin,
}: {
  data: StockData;
  scope: Scope;
  choices: Choice[];
  transferLocations: Choice[];
  operable: boolean;
  admin: boolean;
}) {
  const [selection, setSelection] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const opener = useRef<HTMLElement | null>(null);
  const router = useRouter();
  function open(id = "") {
    opener.current = document.activeElement as HTMLElement;
    setSelection(id);
    setNotice("");
  }
  function close() {
    setSelection(null);
    requestAnimationFrame(() => opener.current?.focus());
  }
  return (
    <section
      className="mt-8 border-t border-line/60 pt-6"
      aria-labelledby={"stock-" + scope.kind}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id={"stock-" + scope.kind} className="mb-1!">
            {scope.kind === "product"
              ? "Lagerplatser och saldo"
              : "Produkter på platsen"}
          </h2>
          <p className="text-sm text-muted">
            {scope.kind === "product"
              ? "Totalt " + BigInt(data.total).toLocaleString("sv-SE") + " st"
              : data.items.length + " produkter"}
          </p>
        </div>
        {operable && (
          <button className="button px-4!" onClick={() => open()}>
            + Registrera händelse
          </button>
        )}
      </div>
      {notice && (
        <p className="mb-4 text-sm text-cyan" role="status">
          {notice}
        </p>
      )}
      {data.items.length ? (
        <ul className="divide-y divide-line/60 overflow-hidden rounded-2xl border border-line bg-surface">
          {data.items.map((row) => (
            <li key={row.id} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <Link
                  className="min-w-0 flex-1"
                  href={
                    scope.kind === "product"
                      ? "/locations/" + row.locationId
                      : "/products/" + row.productId
                  }
                >
                  <p className="wrap-break-word font-medium">
                    {scope.kind === "product"
                      ? row.locationCode
                      : row.productName}
                  </p>
                  <p className="mt-1 wrap-break-word text-xs leading-6 text-muted">
                    {scope.kind === "product" ? row.warehouseName : row.sku}
                  </p>
                </Link>
                <p className="shrink-0 text-xl font-semibold tabular-nums">
                  {row.quantity.toLocaleString("sv-SE")}{" "}
                  <span className="text-xs font-normal text-muted">st</span>
                </p>
              </div>
              {!row.active && (
                <p className="mt-2 text-xs text-muted">
                  Inaktiv produkt eller plats
                </p>
              )}
              {operable && row.active && (
                <button
                  className="mt-2 min-h-13 text-sm text-accent"
                  onClick={() =>
                    open(
                      scope.kind === "product" ? row.locationId : row.productId,
                    )
                  }
                >
                  Registrera händelse
                  <span className="sr-only">
                    {" "}
                    för{" "}
                    {scope.kind === "product"
                      ? row.locationCode
                      : row.productName}
                  </span>
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-line p-5 text-sm leading-7 text-muted">
          {scope.kind === "product"
            ? "Produkten har inte placerats på någon lagerplats ännu."
            : "Det finns inga produkter registrerade på den här platsen."}
        </p>
      )}
      {admin && (
        <Link
          className="mt-3 inline-flex min-h-13 items-center gap-2 text-sm text-cyan"
          href={
            "/inventory/history?" +
            (scope.kind === "product" ? "productId=" : "locationId=") +
            scope.id
          }
        >
          Visa saldohistorik
          <MaterialArrow />
        </Link>
      )}
      {selection !== null && (
        <BottomSheet title="Registrera lagerhändelse" onClose={close}>
          <StockEditor
            scope={scope}
            choices={choices}
            transferLocations={transferLocations}
            initialChoice={selection}
            admin={admin}
            onSaved={() => {
              close();
              setNotice("Lagerhändelsen har registrerats.");
              router.refresh();
            }}
          />
        </BottomSheet>
      )}
    </section>
  );
}
function StockEditor({
  scope,
  choices,
  transferLocations,
  initialChoice,
  admin,
  onSaved,
}: {
  scope: Scope;
  choices: Choice[];
  transferLocations: Choice[];
  initialChoice: string;
  admin: boolean;
  onSaved: () => void;
}) {
  const [type, setType] = useState<MovementType>("RECEIPT");
  const [choice, setChoice] = useState(initialChoice);
  const [destination, setDestination] = useState("");
  const [search, setSearch] = useState("");
  const [pair, setPair] = useState<StockPair | null>(null);
  const [destinationPair, setDestinationPair] = useState<StockPair | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(Boolean(initialChoice));
  const [destinationLoading, setDestinationLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const productId = scope.kind === "product" ? scope.id : choice;
  const sourceLocationId = scope.kind === "product" ? choice : scope.id;
  useEffect(() => {
    if (!productId || !sourceLocationId) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      productId,
      locationId: sourceLocationId,
    });
    fetch("/api/inventory/level?" + params, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error?.message ?? "Kunde inte läsa saldot.");
        if (!controller.signal.aborted) setPair(result.data);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "Kunde inte läsa saldot.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [productId, sourceLocationId, refresh]);

  useEffect(() => {
    if (type !== "TRANSFER" || !productId || !destination) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      productId,
      locationId: destination,
    });
    fetch("/api/inventory/level?" + params, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result.error?.message ?? "Kunde inte läsa destinationssaldot.",
          );
        if (!controller.signal.aborted) setDestinationPair(result.data);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "Kunde inte läsa destinationssaldot.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setDestinationLoading(false);
      });
    return () => controller.abort();
  }, [type, productId, destination, refresh]);
  function reload() {
    setLoading(Boolean(productId && sourceLocationId));
    setDestinationLoading(
      Boolean(type === "TRANSFER" && productId && destination),
    );
    setPair(null);
    setDestinationPair(null);
    setError("");
    setConflict(false);
    setRefresh((value) => value + 1);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !pair ||
      loading ||
      destinationLoading ||
      pending ||
      conflict ||
      (type === "TRANSFER" && !destinationPair)
    )
      return;
    setPending(true);
    setError("");
    try {
      const payload =
        type === "TRANSFER"
          ? {
              type,
              productId: pair.productId,
              sourceLocationId: pair.locationId,
              destinationLocationId: destinationPair!.locationId,
              quantity: Number(quantity),
              expectedSourceVersion: pair.version,
              expectedDestinationVersion: destinationPair!.version,
              reason,
            }
          : {
              type,
              productId: pair.productId,
              locationId: pair.locationId,
              quantity: Number(quantity),
              expectedVersion: pair.version,
              reason,
            };
      const response = await fetch("/api/inventory/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.error?.code === "STOCK_CONFLICT") setConflict(true);
        throw new Error(
          result.error?.details?.[0]?.message ??
            result.error?.message ??
            "Kunde inte registrera lagerhändelsen.",
        );
      }
      onSaved();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Kunde inte registrera lagerhändelsen.",
      );
    } finally {
      setPending(false);
    }
  }
  const matching = choices.filter(
    (item) =>
      item.id === choice ||
      item.label
        .toLocaleLowerCase("sv")
        .includes(search.toLocaleLowerCase("sv")),
  );
  const destinations = transferLocations.filter(
    (item) => item.id !== sourceLocationId,
  );
  const quantityLabel =
    type === "RECEIPT"
      ? "Antal att lägga till"
      : type === "ISSUE"
        ? "Antal att ta ut"
        : type === "TRANSFER"
          ? "Antal att flytta"
          : "Nytt saldo";
  const ready =
    Boolean(pair) &&
    !loading &&
    !destinationLoading &&
    !pending &&
    !conflict &&
    (type !== "TRANSFER" || Boolean(destinationPair));
  return (
    <form className="space-y-5" onSubmit={submit}>
      <p className="wrap-break-word text-sm text-muted">{scope.label}</p>
      <label>
        Händelse
        <select
          value={type}
          onChange={(event) => {
            const next = event.target.value as MovementType;
            setType(next);
            setDestination("");
            setDestinationPair(null);
            setDestinationLoading(false);
            setQuantity("");
            setError("");
            setConflict(false);
          }}
          disabled={pending}
        >
          <option value="RECEIPT">Inleverans</option>
          <option value="ISSUE">Uttag</option>
          <option value="TRANSFER">Flytta</option>
          {admin && <option value="CORRECTION">Korrigera saldo</option>}
        </select>
      </label>
      {!choices.length ? (
        <p className="text-sm leading-7 text-muted">
          {scope.kind === "product"
            ? "Skapa en aktiv lagerplats först."
            : "Skapa en aktiv produkt först."}
        </p>
      ) : (
        <>
          {!initialChoice && (
            <div className="space-y-4">
              <label>
                Sök {scope.kind === "product" ? "lagerplats" : "produkt"}
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  disabled={pending}
                  placeholder="Skriv namn eller kod"
                />
              </label>
              <label>
                {scope.kind === "product" ? "Lagerplats" : "Produkt"}
                <select
                  required
                  value={choice}
                  onChange={(event) => {
                    setChoice(event.target.value);
                    setPair(null);
                    setDestination("");
                    setDestinationPair(null);
                    setQuantity("");
                    setError("");
                    setConflict(false);
                    setLoading(Boolean(event.target.value));
                  }}
                  disabled={pending}
                >
                  <option value="">
                    Välj {scope.kind === "product" ? "lagerplats" : "produkt"}
                  </option>
                  {matching.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              {!matching.length && (
                <p className="text-xs text-muted">
                  Inga träffar. Prova en annan sökning.
                </p>
              )}
            </div>
          )}
          {initialChoice && (
            <p className="wrap-break-word font-medium">
              {choices.find((item) => item.id === initialChoice)?.label}
            </p>
          )}
          {loading && (
            <p className="text-sm text-muted" role="status">
              Hämtar aktuellt saldo…
            </p>
          )}
          {pair && (
            <>
              <p className="rounded-xl bg-canvas p-4 text-sm text-muted">
                Nuvarande saldo:{" "}
                <strong className="text-foreground">
                  {pair.quantity.toLocaleString("sv-SE")} st
                </strong>
              </p>
              {type === "TRANSFER" && (
                <label>
                  Flytta till
                  <select
                    required
                    value={destination}
                    onChange={(event) => {
                      setDestination(event.target.value);
                      setDestinationPair(null);
                      setDestinationLoading(Boolean(event.target.value));
                      setError("");
                      setConflict(false);
                    }}
                    disabled={pending}
                  >
                    <option value="">Välj destinationsplats</option>
                    {destinations.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {destinationLoading && (
                <p className="text-sm text-muted" role="status">
                  Hämtar destinationssaldo…
                </p>
              )}
              {type === "TRANSFER" && destinationPair && (
                <p className="rounded-xl bg-canvas p-4 text-sm text-muted">
                  Saldo på destinationen:{" "}
                  <strong className="text-foreground">
                    {destinationPair.quantity.toLocaleString("sv-SE")} st
                  </strong>
                </p>
              )}
              <label>
                {quantityLabel}
                <input
                  type="number"
                  inputMode="numeric"
                  required
                  min={type === "CORRECTION" ? 0 : 1}
                  max={Number.MAX_SAFE_INTEGER}
                  step={1}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  disabled={pending || conflict}
                />
              </label>
              <label>
                Orsak
                <input
                  required
                  minLength={2}
                  maxLength={500}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={
                    type === "CORRECTION"
                      ? "Beskriv varför saldot korrigeras"
                      : "Exempel: Order, leverans eller intern flytt"
                  }
                  disabled={pending}
                />
              </label>
              {type === "CORRECTION" && (
                <p className="text-xs leading-6 text-muted">
                  Det nya saldot ersätter det nuvarande. Korrigeringen sparas i
                  historiken med din anledning.
                </p>
              )}
            </>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {conflict && (
            <button
              type="button"
              className="button-secondary w-full"
              onClick={reload}
            >
              Läs in aktuella saldon
            </button>
          )}
          {((!pair && choice && !loading) ||
            (type === "TRANSFER" &&
              destination &&
              !destinationPair &&
              !destinationLoading)) &&
            error && (
            <button
              type="button"
              className="button-secondary w-full"
              onClick={reload}
            >
              Försök igen
            </button>
            )}
          <button className="button w-full" disabled={!ready}>
            {pending ? "Registrerar…" : "Registrera lagerhändelse"}
          </button>
        </>
      )}
    </form>
  );
}
