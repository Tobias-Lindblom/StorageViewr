import { AppIcon } from "./app-icon";

export function InventoryPreview() {
  return (
    <figure className="preview-stage">
      <div className="preview-card">
        <div
          className="-mt-2 flex h-8 items-center justify-center"
          aria-hidden="true"
        >
          <span className="h-1 w-10 rounded-full bg-muted/40" />
        </div>

        <div className="border-b border-line/60 pb-4">
          <h2 className="mb-0! text-xl!">Räkna A-01-02</h2>
        </div>

        <div className="pt-5">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2.5">
            <span className="inline-flex min-w-0 items-center gap-2 text-xs font-medium text-emerald-400">
              <AppIcon name="check" width={18} height={18} />
              Lagerplats verifierad
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-accent">
              <AppIcon name="qr" width={17} height={17} />
              Skanna igen
            </span>
          </div>

          <p className="mt-4 text-xs leading-5 text-muted">
            Ange faktiskt antal. Saldot uppdateras först när inventeringen
            genomförs.
          </p>

          <div className="mb-3 mt-5 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Produkter</h3>
            <span className="text-xs text-muted">1 produkt</span>
          </div>

          <div className="rounded-2xl border border-line bg-canvas p-4">
            <p className="font-semibold">Arbetshandske</p>
            <p className="mt-1 text-xs text-muted">
              HANDSKE-1 · Aktuellt saldo 9 st
            </p>

            <div className="mt-4">
              <p className="text-xs font-medium text-foreground">
                Räknat antal
              </p>
              <div className="mt-2 flex min-h-12 items-center rounded-xl border border-line bg-surface px-4 text-base tabular-nums">
                9
              </div>
              <p className="mt-2 text-xs text-muted">Ingen avvikelse</p>
            </div>
          </div>

          <div className="mt-4 flex min-h-13 items-start gap-3 rounded-xl border border-line bg-canvas p-3.5 text-xs leading-5">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-violet-300/60 bg-violet-500 text-[10px] text-white"
            >
              ✓
            </span>
            <span>
              Alla produkter på platsen är räknade och antalen kontrollerade.
            </span>
          </div>

          <div className="button mt-4 min-h-12 w-full" aria-hidden="true">
            Bekräfta och spara plats
          </div>
        </div>
      </div>
      <figcaption className="mt-5 text-center text-xs text-muted">
        Räkningsflödet i StorageViewr.
      </figcaption>
    </figure>
  );
}
