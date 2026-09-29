"use client";
import { useRef, useState, type ChangeEvent } from "react";
import { ProductPhoto } from "@/components/product-photo";
import { AppIcon } from "@/components/app-icon";
import { preparePhotoForUpload } from "./prepare-photo";

export function ProductPhotoPicker({ existing, value, onChange, onBusy, disabled }: {
  existing?: string; value: string | null | undefined; onChange: (value: string | null | undefined) => void;
  onBusy: (busy: boolean) => void; disabled: boolean;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const source = value === undefined ? existing : value;
  async function select(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(""); setBusy(true); onBusy(true);
    try { onChange(await preparePhotoForUpload(file)); }
    catch (error) { setError(error instanceof Error ? error.message : "Bilden kunde inte läsas."); }
    finally { setBusy(false); onBusy(false); }
  }
  return <section aria-labelledby="product-photo-heading">
    <h2 id="product-photo-heading" className="mb-4! text-xl!">Produktbild <span className="text-sm font-normal text-muted">(valfritt)</span></h2>
    <input ref={camera} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Ta produktfoto" className="hidden" onChange={select} disabled={disabled || busy} />
    <input ref={gallery} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Välj produktbild" className="hidden" onChange={select} disabled={disabled || busy} />
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className={source ? "grid sm:grid-cols-[180px_minmax(0,1fr)]" : ""}>
        {source ? (
          <div className="flex min-h-44 items-center justify-center border-b border-line/60 bg-canvas p-3 sm:border-r sm:border-b-0">
            <ProductPhoto src={source} alt="Förhandsvisning av produktbild" eager className="max-h-44 w-full object-contain" />
          </div>
        ) : (
          <div className="flex items-center gap-4 p-5 sm:p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-accent">
              <AppIcon name="camera" />
            </span>
            <div className="min-w-0">
              <h3 className="mb-1! text-sm! font-semibold">Ingen bild vald</h3>
              <p className="text-xs leading-5 text-muted">Ett foto gör produkten enklare att känna igen.</p>
            </div>
          </div>
        )}

        <div className={source ? "flex flex-col justify-center p-5 sm:p-6" : "border-t border-line/60 p-5 sm:p-6"}>
          {source && (
            <div className="mb-4">
              <h3 className="mb-1! text-sm! font-semibold">Produktbild vald</h3>
              <p className="text-xs leading-5 text-muted">Bilden sparas tillsammans med produkten.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="button-secondary gap-2! px-3!" onClick={() => camera.current?.click()} disabled={disabled || busy}><AppIcon name="camera" />Ta foto</button>
            <button type="button" className="button-secondary px-3!" onClick={() => gallery.current?.click()} disabled={disabled || busy}>Välj bild</button>
          </div>
          {(source || (value !== undefined && existing)) && (
            <div className="mt-2 flex flex-wrap gap-x-5">
              {source && <button type="button" className="min-h-11 text-sm text-accent" onClick={() => { onChange(null); setError(""); }} disabled={disabled || busy}>Ta bort bild</button>}
              {value !== undefined && existing && <button type="button" className="min-h-11 text-sm text-muted" onClick={() => { onChange(undefined); setError(""); }} disabled={disabled || busy}>Ångra ändring</button>}
            </div>
          )}
          <p className="mt-3 text-xs leading-5 text-muted" role="status">{busy ? "Förbereder bilden…" : "JPG, PNG eller WebP."}</p>
        </div>
      </div>
    </div>
    {error && <p className="error mt-3" role="alert">{error}</p>}
  </section>;
}
