"use client";
import { useRef, useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { MaterialArrow } from "@/components/material-arrow";
import { clientApi } from "@/lib/client-api";
import type { InventoryDetail } from "./session-queries";
import { DownloadInventoryReport } from "./download-report";
import { CountPlace } from "./count-place";

const number = (value: number) => value.toLocaleString("sv-SE");
export function InventoryWorkspace({
  initial,
  admin,
  initialLocationId,
  initialLocationVerified = false,
}: {
  initial: InventoryDetail;
  admin: boolean;
  initialLocationId?: string;
  initialLocationVerified?: boolean;
}) {
  const [data, setData] = useState(initial);
  const [refresh, setRefresh] = useState(0);
  const [placeId, setPlaceId] = useState<string | null>(
    initial.status === "active" ? (initialLocationId ?? null) : null,
  );
  const [verifiedPlaceId, setVerifiedPlaceId] = useState<string | null>(
    initialLocationVerified ? (initialLocationId ?? null) : null,
  );
  const [review, setReview] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const opener = useRef<HTMLElement | null>(null);
  const completed = data.status === "completed";
  const ready =
    data.counted === data.places.length &&
    !data.places.some((row) => row.stale);
  const place = data.places.find((row) => row.id === placeId);
  function openPlace(id: string) {
    setVerifiedPlaceId(null);
    opener.current = document.activeElement as HTMLElement;
    setPlaceId(id);
    setNotice("");
  }
  function close() {
    setPlaceId(null);
    setVerifiedPlaceId(null);
    setReview(false);
    requestAnimationFrame(() => opener.current?.focus());
  }
  async function reload() {
    const next = await clientApi<InventoryDetail>(
      "/api/inventory/sessions/" + data.id,
      "GET",
    );
    setData(next);
    setRefresh((value) => value + 1);
    return next;
  }
  async function finish() {
    setBusy(true);
    setError("");
    try {
      await clientApi(
        "/api/inventory/sessions/" + data.id + "/complete",
        "POST",
        { expectedRevision: data.revision, confirmed },
      );
      await reload();
      close();
      setNotice(
        "Inventeringen är genomförd. Saldon och historik har uppdaterats.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Kunde inte genomföra inventeringen.",
      );
      setConfirmed(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="mb-2! text-2xl! leading-tight sm:text-3xl!">
            {data.name}
          </h1>
        </div>
        <p className="text-sm text-muted">
          {data.warehouseName}
          {data.completedAt &&
            " · Genomförd " +
              new Date(data.completedAt).toLocaleDateString("sv-SE")}
        </p>
      </div>
      <section
        className="mb-7 rounded-2xl border border-line bg-surface p-5"
        aria-label="Inventeringsstatus"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm">
            <strong className="text-xl">{data.counted}</strong> /{" "}
            {data.places.length} platser räknade
          </p>
        </div>
        <progress
          value={data.counted}
          max={data.places.length || 1}
          aria-label="Räknade platser"
          className="mt-4 h-2 w-full accent-violet-500"
        />
        {!completed && (
          <p className="mt-3 text-xs leading-6 text-muted">
            Lagersaldot uppdateras först när inventeringen genomförs.
          </p>
        )}
      </section>
      {notice && (
        <p role="status" className="mb-5 text-sm text-cyan">
          {notice}
        </p>
      )}
      <h2 className="mb-4!">Lagerplatser</h2>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {data.places.map((row) => (
          <div key={row.id} className="border-b border-line/60 last:border-0">
            {completed ? (
              <details className="group px-5">
                <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-3 py-4">
                  <span>
                    <span className="block font-semibold">{row.code}</span>
                    <span className="mt-1 block text-xs text-muted">
                      {row.rows.length} produkter · {row.completedByName}
                    </span>
                  </span>
                  <MaterialArrow
                    name="expand"
                    className="text-accent transition group-open:rotate-180"
                  />
                </summary>
                <div className="border-t border-line/60 pb-4">
                  {row.rows.length ? (
                    row.rows.map((item) => (
                      <div key={item.productId} className="py-3 text-sm">
                        <p className="font-medium">{item.productName}</p>
                        <p className="mt-1 text-xs text-muted">{item.sku}</p>
                        <p className="mt-2">
                          Förväntat {number(item.expectedQuantity)} · Räknat{" "}
                          {number(item.countedQuantity ?? 0)} · Avvikelse{" "}
                          {number(item.difference ?? 0)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="pt-4 text-sm text-muted">
                      Platsen bekräftades som tom.
                    </p>
                  )}
                </div>
              </details>
            ) : (
              <button
                className="flex min-h-22 w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-surface-raised"
                onClick={() => openPlace(row.id)}
              >
                <span className="min-w-0">
                  <span className="block break-all font-semibold">
                    {row.code}
                  </span>
                  <span
                    className={
                      "mt-1 block text-xs " +
                      (row.stale
                        ? "text-amber-200"
                        : row.status === "counted"
                          ? "text-cyan"
                          : "text-muted")
                    }
                  >
                    {row.stale
                      ? "Saldot har ändrats · Räkna om"
                      : row.status === "counted"
                        ? "Räknad · " + row.completedByName
                        : row.rows.length
                          ? row.rows.length + " produkter att räkna"
                          : "Bekräfta tom plats eller lägg till produkt"}
                  </span>
                </span>
                <MaterialArrow className="text-accent" />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-start gap-3">
        {completed && <DownloadInventoryReport inventoryId={data.id} />}
        {!completed && (
          <button
            className={
              (admin && ready ? "button" : "button-secondary") +
              " w-full sm:w-auto"
            }
            onClick={() => {
              opener.current = document.activeElement as HTMLElement;
              setConfirmed(false);
              setError("");
              setReview(true);
            }}
          >
            {admin && ready
              ? "Granska och genomför"
              : data.discrepancies.length
                ? "Granska avvikelser"
                : "Granska räkningar"}
          </button>
        )}
        {!completed && admin && !ready && (
          <p className="mt-3 text-xs leading-6 text-muted">
            Alla platser måste vara räknade med aktuella saldon innan du kan
            genomföra.
          </p>
        )}
      </div>
      {place && !completed && (
        <BottomSheet title={"Räkna " + place.code} onClose={close}>
          <CountPlace
            key={place.id + ":" + place.revision + ":" + refresh}
            inventoryId={data.id}
            place={place}
            verified={verifiedPlaceId === place.id}
            onVerified={() => setVerifiedPlaceId(place.id)}
            reload={reload}
            onSaved={async () => {
              await reload();
              close();
              setNotice(place.code + " har räknats och sparats.");
            }}
          />
        </BottomSheet>
      )}
      {review && !completed && (
        <BottomSheet
          title="Granska inventering"
          onClose={close}
        >
          <p className="mb-5 text-sm leading-7 text-muted">
            {data.counted} av {data.places.length} platser räknade.{" "}
            {data.discrepancies.length} avvikelser att granska.
          </p>
          {data.discrepancies.length ? (
            <ul className="mb-5 divide-y divide-line">
              {data.discrepancies.map((row) => (
                <li key={row.locationId + row.productId} className="py-4">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <p className="wrap-break-word font-medium">
                        {row.productName}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {row.locationCode} · {row.sku}
                      </p>
                    </div>
                    <strong
                      className={
                        "shrink-0 text-sm " +
                        (row.difference! < 0 ? "text-rose-200" : "text-cyan")
                      }
                    >
                      {row.difference! > 0 ? "+" : ""}
                      {number(row.difference!)} st
                    </strong>
                  </div>
                  <p className="mt-3 text-sm">
                    Förväntat {number(row.expectedQuantity)} · Räknat{" "}
                    {number(row.countedQuantity!)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {row.countedByName}
                    {row.countedAt &&
                      " · " + new Date(row.countedAt).toLocaleString("sv-SE")}
                  </p>
                  {row.stale && (
                    <p className="mt-2 text-xs text-amber-200">
                      Saldot har ändrats. Räkna om platsen.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-5 rounded-xl border border-line p-4 text-sm text-muted">
              Inga registrerade avvikelser.
            </p>
          )}
          {admin && (
            <>
              <label className="flex min-h-13 items-start gap-3 text-sm leading-6">
                <input
                  type="checkbox"
                  className="mt-1! h-4! min-h-0! w-4! shrink-0 px-0! accent-violet-500"
                  checked={confirmed}
                  disabled={!ready || busy}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                <span>
                  Jag har granskat räkningarna och vill uppdatera saldona.
                  Avslutet kan inte ändras.
                </span>
              </label>
              {error && (
                <div role="alert" className="mt-4 text-sm text-rose-200">
                  <p>{error}</p>
                  <button
                    className="mt-2 min-h-11 text-cyan"
                    onClick={async () => {
                      try {
                        await reload();
                        setError("");
                      } catch {
                        setError(
                          "Kunde inte läsa in inventeringen. Försök igen.",
                        );
                      }
                    }}
                  >
                    Läs in inventeringen igen
                  </button>
                </div>
              )}
              <button
                className="button mt-5 w-full"
                disabled={!ready || !confirmed || busy}
                onClick={finish}
              >
                {busy ? "Genomför…" : "Genomför och uppdatera saldo"}
              </button>
            </>
          )}
        </BottomSheet>
      )}
    </>
  );
}
