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
  return <section aria-labelledby="product-photo-heading" className="space-y-3">
    <h2 id="product-photo-heading" className="mb-0! text-sm font-medium">Produktbild <span className="font-normal text-muted">(valfritt)</span></h2>
    {source ? <div className="overflow-hidden rounded-2xl border border-line bg-canvas">
      <ProductPhoto src={source} alt="Förhandsvisning av produktbild" eager className="h-56 w-full object-contain sm:h-64" />
    </div> : <div className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-canvas p-5 text-muted">
      <AppIcon name="camera" width={28} height={28} /><p className="text-sm">Lägg till ett foto av produkten</p>
    </div>}
    <input ref={camera} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Ta produktfoto" className="hidden" onChange={select} disabled={disabled || busy} />
    <input ref={gallery} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Välj produktbild" className="hidden" onChange={select} disabled={disabled || busy} />
    <div className="grid grid-cols-2 gap-2">
      <button type="button" className="button gap-2! px-3!" onClick={() => camera.current?.click()} disabled={disabled || busy}><AppIcon name="camera" />Ta foto</button>
      <button type="button" className="button-secondary px-3!" onClick={() => gallery.current?.click()} disabled={disabled || busy}>Välj bild</button>
    </div>
    {source && <button type="button" className="min-h-13 text-sm text-accent" onClick={() => { onChange(null); setError(""); }} disabled={disabled || busy}>Ta bort bild</button>}
    {value !== undefined && existing && <button type="button" className="ml-4 min-h-13 text-sm text-muted" onClick={() => { onChange(undefined); setError(""); }} disabled={disabled || busy}>Ångra bildändring</button>}
    <p className="text-xs leading-6 text-muted" role="status">{busy ? "Förbereder bilden…" : "Ta ett foto eller välj en bild. Bilden sparas när du sparar produkten."}</p>
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}
