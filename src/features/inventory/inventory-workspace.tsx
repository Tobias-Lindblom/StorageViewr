"use client";
import { useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";
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
  const remaining = Math.max(0, data.places.length - data.counted);
  const progress = data.places.length
    ? Math.round((data.counted / data.places.length) * 100)
    : 0;
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
      <header className="mb-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="mb-0! text-3xl! leading-tight sm:text-4xl!">
              {data.name}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {data.warehouseName}
              {data.completedAt &&
                " · Avslutad " +
                  new Date(data.completedAt).toLocaleDateString("sv-SE")}
            </p>
          </div>
          <span
            className={
              "inline-flex shrink-0 items-center gap-2 pt-2 text-xs " +
              (completed ? "text-cyan" : "text-accent")
            }
          >
            <span
              aria-hidden="true"
              className={
                "h-1.5 w-1.5 rounded-full " +
                (completed ? "bg-cyan" : "bg-accent")
              }
            />
            {completed ? "Genomförd" : "Pågående"}
          </span>
        </div>
      </header>

      <section
        className="mb-7 overflow-hidden rounded-2xl border border-line bg-surface"
        aria-label="Inventeringsstatus"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-muted">Framsteg</p>
              <p className="mt-1 text-sm">
                <strong className="text-xl">{data.counted}</strong> av {data.places.length} platser
              </p>
            </div>
            <span className="text-sm font-medium tabular-nums text-muted">{progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Räknade platser"
            aria-valuemin={0}
            aria-valuemax={data.places.length}
            aria-valuenow={data.counted}
            className="mt-4 h-1.5 overflow-hidden rounded-full bg-line"
          >
            <div
              className={"h-full rounded-full " + (completed ? "bg-cyan" : "bg-violet-500")}
              style={{ width: progress + "%" }}
            />
          </div>
        </div>
        {!completed && (
          <div className="border-t border-line/60 px-5 py-4 text-xs leading-5 text-muted sm:px-6">
            <p>
              {remaining
                ? remaining === 1
                  ? "1 lagerplats återstår att räkna."
                  : remaining + " lagerplatser återstår att räkna."
                : "Alla lagerplatser är räknade och redo att granskas."}
            </p>
            <p className="mt-1">Lagersaldot ändras först när inventeringen genomförs.</p>
          </div>
        )}
      </section>
      {notice && (
        <p role="status" className="mb-5 rounded-xl border border-cyan/20 bg-cyan/5 p-4 text-sm text-cyan">
          {notice}
        </p>
      )}
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="mb-0!">Lagerplatser</h2>
        <span className="text-xs text-muted">
          {data.places.length} {data.places.length === 1 ? "plats" : "platser"}
        </span>
      </div>
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
                className="group flex min-h-20 w-full items-center gap-4 px-4 py-4 text-left transition hover:bg-surface-raised sm:px-5"
                onClick={() => openPlace(row.id)}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-accent">
                  <AppIcon name="location" width={19} height={19} />
                </span>
                <span className="min-w-0 flex-1">
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
                          ? row.rows.length === 1
                            ? "1 produkt att räkna"
                            : row.rows.length + " produkter att räkna"
                          : "Bekräfta tom plats eller lägg till produkt"}
                  </span>
                </span>
                <MaterialArrow
                  size={18}
                  className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent"
                />
              </button>
            )}
          </div>
        ))}
      </div>
      {(completed || data.counted > 0) && (
        <div className="mt-6">
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
        </div>
      )}
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
          footer={
            admin ? (
              <>
                {error && (
                  <div role="alert" className="error mb-3">
                    <p>{error}</p>
                    <button
                      type="button"
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
                  type="button"
                  className="button w-full"
                  disabled={!ready || !confirmed || busy}
                  onClick={finish}
                >
                  {busy ? "Genomför…" : "Genomför och uppdatera saldo"}
                </button>
              </>
            ) : undefined
          }
        >
          <div className="overflow-hidden rounded-2xl border border-line bg-canvas">
            <dl className="grid grid-cols-2 divide-x divide-line/60 p-5 text-center">
              <div className="px-2">
                <dt className="text-xs text-muted">Räknade platser</dt>
                <dd className="mt-1 text-xl font-semibold">
                  {data.counted} / {data.places.length}
                </dd>
              </div>
              <div className="px-2">
                <dt className="text-xs text-muted">Avvikelser</dt>
                <dd className="mt-1 text-xl font-semibold">
                  {data.discrepancies.length}
                </dd>
              </div>
            </dl>
            {!ready && (
              <p className="border-t border-line/60 px-5 py-3 text-xs leading-5 text-amber-200">
                {remaining
                  ? remaining === 1
                    ? "1 lagerplats återstår att räkna."
                    : remaining + " lagerplatser återstår att räkna."
                  : "Minst en lagerplats har ett ändrat saldo och måste räknas om."}
              </p>
            )}
          </div>
          {data.discrepancies.length ? (
            <section className="mt-6" aria-labelledby="review-discrepancies-heading">
              <h3 id="review-discrepancies-heading" className="mb-3! text-base!">
                Avvikelser
              </h3>
              <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
                {data.discrepancies.map((row) => (
                  <li
                    key={row.locationId + row.productId}
                    className="border-b border-line/60 p-4 last:border-0 sm:p-5"
                  >
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
                          (row.difference! < 0
                            ? "text-rose-200"
                            : "text-cyan")
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
                        " · " +
                          new Date(row.countedAt).toLocaleString("sv-SE")}
                    </p>
                    {row.stale && (
                      <p className="mt-2 text-xs text-amber-200">
                        Saldot har ändrats. Räkna om platsen.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
              <span className="shrink-0 text-emerald-400">
                <AppIcon name="check" />
              </span>
              <div>
                <p className="text-sm font-medium text-emerald-400">
                  Inga avvikelser
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  De räknade antalen stämmer med aktuellt lagersaldo.
                </p>
              </div>
            </div>
          )}
          {admin && (
            <label className="mt-5 flex min-h-13 items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm leading-6">
              <input
                type="checkbox"
                className="mt-1! h-4! min-h-0! w-4! shrink-0 px-0! accent-violet-500"
                checked={confirmed}
                disabled={!ready || busy}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>
                Jag har granskat räkningarna och godkänner att lagersaldot
                uppdateras. Åtgärden kan inte ångras.
              </span>
            </label>
          )}
        </BottomSheet>
      )}
    </>
  );
}
