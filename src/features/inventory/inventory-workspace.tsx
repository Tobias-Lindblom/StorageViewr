"use client";
import { useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { BottomSheet } from "@/components/bottom-sheet";
import Link from "next/link";
import { clientApi } from "@/lib/client-api";
import type { InventoryDetail } from "./session-queries";
import { DownloadInventoryReport } from "./download-report";
import { CountPlace } from "./count-place";
import { InventorySignature } from "./inventory-signature";
import { BaselineSummary } from "./baseline-summary";
import { IncomingValueEditor, type IncomingValueDraft } from "./incoming-value-editor";
import { IncomingValueSummary } from "./incoming-value-summary";
import {
  formatInventoryDate as date,
  formatInventoryNumber as number,
  inventoryDiscrepancyKey as discrepancyKey,
} from "./inventory-format";
import { CompletedInventoryPlace } from "./completed-inventory-place";

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
  const [signerName, setSignerName] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [incomingValueEntries, setIncomingValueEntries] = useState<IncomingValueDraft[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, "APPROVE" | "INVESTIGATE">>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const opener = useRef<HTMLElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const completed = data.status === "completed";
  const ready =
    data.counted === data.places.length &&
    !data.places.some((row) => row.stale);
  const remaining = Math.max(0, data.places.length - data.counted);
  const progress = data.places.length
    ? Math.round((data.counted / data.places.length) * 100)
    : 0;
  const allDiscrepanciesHandled = data.discrepancies.every(row =>
    Boolean(resolutions[discrepancyKey(row.productId, row.locationId)]));
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
    requestAnimationFrame(() => {
      if (opener.current?.isConnected) opener.current.focus();
      else heading.current?.focus();
    });
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
        { expectedRevision: data.revision, confirmed, signerName, signatureDataUrl,
          incomingValueEntries,
          resolutions: data.discrepancies.map(row => ({
            productId: row.productId, locationId: row.locationId,
            action: resolutions[discrepancyKey(row.productId, row.locationId)],
          })) },
      );
      await reload();
      close();
      setNotice(
        data.establishesBaseline
          ? "Baseline är etablerad. Startsaldon och historik har uppdaterats."
          : "Inventeringen är genomförd. Saldon och historik har uppdaterats.",
      );
      setSignerName("");
      setSignatureDataUrl(null);
      setIncomingValueEntries([]);
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
    <article className="inventory-detail" aria-labelledby="inventory-detail-heading">
      <div className="product-detail-toolbar">
        <Link href={completed ? "/inventories/completed" : "/inventories"} className="product-back">
          <AppIcon name="chevron" width={16} height={16} />Tillbaka
        </Link>
        <span className="inventory-detail-type">Inventering</span>
      </div>
      <header className="inventory-detail-header">
        <span className={"inventory-detail-marker" + (completed ? " is-completed" : "")}>
          <AppIcon name={completed ? "verified" : "inventory"} width={27} height={27} />
        </span>
        <div className="inventory-detail-identity">
          <h1 id="inventory-detail-heading" ref={heading} tabIndex={-1}>{data.name}</h1>
          <p>{data.warehouseName}</p>
          <div className="inventory-detail-dates">
            <span>Startad <time dateTime={data.startedAt}>{date(data.startedAt)}</time></span>
            {data.completedAt && <span>Avslutad <time dateTime={data.completedAt}>{date(data.completedAt)}</time></span>}
          </div>
        </div>
        <span className={"inventory-card-status" + (completed ? " is-completed" : "")}>
          {completed ? "Genomförd" : "Pågående"}
        </span>
      </header>
      <section className={"inventory-detail-summary" + (completed ? " is-completed" : "")} aria-label="Inventeringsstatus">
        <div className="inventory-detail-progress-top">
          <div><p>Räknade platser</p><strong>{data.counted} <span>av {data.places.length} {data.places.length === 1 ? "plats" : "platser"}</span></strong></div>
          <span>{progress}%</span>
        </div>
        <div role="progressbar" aria-label="Räknade platser" aria-valuemin={0}
          aria-valuemax={data.places.length} aria-valuenow={data.counted} className="inventory-detail-progress">
          <div style={{ width: progress + "%" }} />
        </div>
        <div className="inventory-detail-summary-meta">
          <span>{completed ? "Inventeringen är genomförd" : remaining
            ? remaining + (remaining === 1 ? " plats kvar att räkna" : " platser kvar att räkna")
            : ready ? "Alla platser är räknade" : "Räknade platser behöver kontrolleras igen"}</span>
          <span className={data.discrepancies.length ? "has-differences" : ""}>
            {data.discrepancies.length} {data.discrepancies.length === 1 ? "avvikelse" : "avvikelser"}
          </span>
        </div>
      </section>
      {!completed && <p className="inventory-detail-note">
        Lagersaldot uppdateras när inventeringen genomförs.
      </p>}
      {completed && data.completionSignerName && data.completionSignedAt && (
        <p className="inventory-detail-signed">
          <AppIcon name="check" width={17} height={17} />
          Signerad av <strong>{data.completionSignerName}</strong>
          <span>·</span>
          <time dateTime={data.completionSignedAt}>{date(data.completionSignedAt)}</time>
        </p>
      )}
      {completed && data.baselineSummary && <BaselineSummary data={data} />}
      {completed && data.incomingValueSummary && <IncomingValueSummary data={data} />}
      {!completed && data.places.some(row => row.stale) && <p className="inventory-detail-stale-note">
        Saldot har ändrats på en räknad plats. Räkna om markerade platser före slutförande.
      </p>}
      {notice && <p role="status" className="inventory-detail-notice">{notice}</p>}
      <section className="inventory-detail-places" aria-labelledby="inventory-places-heading">
        <div className="product-section-heading">
          <h2 id="inventory-places-heading">Lagerplatser ({data.places.length})</h2>
        </div>
        <ul className="inventory-place-list">
          {data.places.map(row => <li key={row.id}>
            {completed ? <CompletedInventoryPlace place={row} establishesBaseline={data.establishesBaseline} /> : <button type="button" className="inventory-place-row" aria-haspopup="dialog"
              onClick={() => openPlace(row.id)} data-state={row.stale ? "stale" : row.status}>
              <span className="inventory-place-marker"><AppIcon name="location" width={27} height={27}
                fill="currentColor" strokeWidth={0} fillRule="evenodd" /></span>
              <span className="inventory-place-identity">
                <span>{row.code}</span>
                <span>{row.stale ? "Saldot har ändrats" : row.status === "counted"
                  ? row.completedByName || "Platsen är räknad"
                  : row.rows.length ? row.rows.length + (row.rows.length === 1 ? " produkt att räkna" : " produkter att räkna")
                  : "Bekräfta tom plats eller lägg till produkt"}</span>
              </span>
              <span className={"inventory-place-badge " + (row.stale ? "is-stale" : row.status === "counted" ? "is-counted" : "")}>
                {row.stale ? "Räkna om" : row.status === "counted" ? "Räknad" : "Ej räknad"}
              </span>
              <AppIcon name="chevron" width={15} height={15} className="inventory-place-arrow" />
            </button>}
          </li>)}
        </ul>
      </section>
      {(completed || data.counted > 0) && <div className="inventory-detail-actions">
        {completed ? <DownloadInventoryReport inventoryId={data.id} className="location-inventory-action inventory-report-action" /> :
          <button type="button" className={(admin && ready ? "location-inventory-action" : "inventory-review-action-secondary") + " inventory-review-action"}
            onClick={() => {
              opener.current = document.activeElement as HTMLElement;
              setConfirmed(false); setError(""); setReview(true);
            }}>
            <AppIcon name="inventory" width={17} height={17} />
            {admin && ready ? "Granska och genomför" : data.discrepancies.length ? "Granska avvikelser" : "Granska räkningar"}
          </button>}
      </div>}
      {place && !completed && (
        <BottomSheet title={(verifiedPlaceId === place.id ? "Räkna " : "Skanna ") + place.code} onClose={close}>
          <CountPlace
            key={place.id + ":" + place.revision + ":" + refresh}
            inventoryId={data.id}
            place={place}
            verified={verifiedPlaceId === place.id}
            onVerified={() => setVerifiedPlaceId(place.id)}
            onCancel={close}
            reload={reload}
            onSaved={async () => {
              await reload();
              close();
              setNotice(place.code + " har räknats och sparats.");
            }}
          />
        </BottomSheet>
      )}
      {review && !completed && <BottomSheet title="Granska inventering" onClose={close}
        footer={admin ? <>
          {error && <div role="alert" className="error mb-3">
            <p>{error}</p>
            <button type="button" className="mt-2 min-h-11 text-cyan" onClick={async () => {
              try { await reload(); setError(""); }
              catch { setError("Kunde inte läsa in inventeringen. Försök igen."); }
            }}>Läs in inventeringen igen</button>
          </div>}
          <button type="button" className="button w-full"
            disabled={!ready || !confirmed || !allDiscrepanciesHandled || !signatureDataUrl || signerName.trim().length < 2 || busy}
            onClick={finish}>
            {busy ? "Genomför…" : "Signera och genomför"}
          </button>
        </> : undefined}>
        <div className="inventory-review-summary">
          <dl>
            <div><dt>Räknade platser</dt><dd>{data.counted} / {data.places.length}</dd></div>
            <div><dt>Avvikelser</dt><dd>{data.discrepancies.length}</dd></div>
          </dl>
          {!ready && <p>{remaining ? remaining + (remaining === 1 ? " plats återstår att räkna." : " platser återstår att räkna.")
            : "Saldot har ändrats. Räkna om markerade platser."}</p>}
        </div>
        {data.discrepancies.length ? <section className="inventory-review-discrepancies" aria-labelledby="review-discrepancies-heading">
          <h3 id="review-discrepancies-heading">Avvikelser</h3>
          <ul>{data.discrepancies.map(row => <li key={row.locationId + row.productId}>
            <div className="inventory-review-product">
              <div><p>{row.productName}</p><span>{row.locationCode} · SKU {row.sku}</span></div>
              <strong className={row.difference! < 0 ? "is-negative" : "is-positive"}>
                {row.difference! > 0 ? "+" : ""}{number(row.difference!)} st
              </strong>
            </div>
            <p className="inventory-review-quantities">Förväntat {number(row.expectedQuantity)} · Räknat {number(row.countedQuantity!)}</p>
            <p className="inventory-review-actor">{row.countedByName}
              {row.countedAt && " · " + new Date(row.countedAt).toLocaleString("sv-SE", {
                timeZone: "Europe/Stockholm", dateStyle: "medium", timeStyle: "short",
              })}</p>
            {row.stale && <p className="inventory-detail-stale-note">Saldot har ändrats. Räkna om platsen.</p>}
            {admin && !row.stale && <div className="inventory-discrepancy-actions" role="group" aria-label={"Hantera avvikelse för " + row.productName}>
              <button type="button" onClick={() => { setReview(false); openPlace(row.locationId); }}>
                Räkna igen
              </button>
              <button type="button" className={resolutions[discrepancyKey(row.productId, row.locationId)] === "APPROVE" ? "is-selected" : ""}
                onClick={() => setResolutions(current => ({ ...current, [discrepancyKey(row.productId, row.locationId)]: "APPROVE" }))}>
                Godkänn räknat saldo
              </button>
              <button type="button" className={resolutions[discrepancyKey(row.productId, row.locationId)] === "INVESTIGATE" ? "is-selected" : ""}
                onClick={() => setResolutions(current => ({ ...current, [discrepancyKey(row.productId, row.locationId)]: "INVESTIGATE" }))}>
                Markera för utredning
              </button>
            </div>}
          </li>)}</ul>
        </section> : <div className="inventory-review-no-differences">
          <AppIcon name="verified" width={23} height={23} />
          <div><p>{data.establishesBaseline ? "Startsaldon redo" : "Inga avvikelser"}</p><span>{data.establishesBaseline
            ? "Räknade saldon etableras som verifierade startsaldon när inventeringen slutförs."
            : "De sparade räkningarna har inga saldoavvikelser."}</span></div>
        </div>}
        {admin && ready && allDiscrepanciesHandled && (
          <>
            <IncomingValueEditor
              entries={incomingValueEntries}
              onChange={setIncomingValueEntries}
              disabled={busy}
            />
            <InventorySignature
              signerName={signerName}
              signatureDataUrl={signatureDataUrl}
              onSignerNameChange={setSignerName}
              onSignatureChange={setSignatureDataUrl}
              disabled={busy}
            />
          </>
        )}
        {admin && <label className="inventory-review-confirm">
          <input type="checkbox" className="m-0! mt-1! h-4! min-h-0! w-4! shrink-0 px-0! accent-accent"
            checked={confirmed} disabled={!ready || !allDiscrepanciesHandled || busy} onChange={event => setConfirmed(event.target.checked)} />
          <span>{data.establishesBaseline
            ? "Jag har granskat räkningarna och bekräftar att de ska etableras som lagrets verifierade startsaldon."
            : "Jag har granskat räkningarna och valt hur varje avvikelse ska hanteras. Godkända saldon uppdateras när inventeringen slutförs."}</span>
        </label>}
      </BottomSheet>}
    </article>
  );
}
