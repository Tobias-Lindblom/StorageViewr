export function InventoryPreview() {
  return (
    <figure className="preview-stage">
      <div className="preview-card">
        <div className="mb-7 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">StorageViewr<span className="text-accent">.</span></span>
          <span className="rounded-full border border-cyan/25 bg-cyan/10 px-3 py-1 text-xs text-cyan">Inventering</span>
        </div>
        <div className="preview-scan mb-6 h-28" aria-hidden="true">
          <svg width="70" height="70" viewBox="0 0 70 70" fill="none">
            <path d="M6 24V10a4 4 0 0 1 4-4h14M46 6h14a4 4 0 0 1 4 4v14M64 46v14a4 4 0 0 1-4 4H46M24 64H10a4 4 0 0 1-4-4V46" stroke="#c9a8ff" strokeWidth="2" strokeLinecap="round" />
            <path d="M20 20h10v10H20zM40 20h10v10H40zM20 40h10v10H20z" stroke="#f3edff" strokeWidth="3" />
            <path d="M40 39h5v6h6v6H39v-6" stroke="#f3edff" strokeWidth="3" />
            <path d="M1 35h68" stroke="#9be7f5" strokeWidth="2" />
          </svg>
        </div>
        <div className="mb-5 flex items-end justify-between gap-3">
          <div><p className="mb-1 text-xs text-muted">LAGERPLATS</p><p className="text-3xl font-semibold tracking-tight">B-03-02</p></div>
          <span className="pb-1 text-xs text-muted">Borås · Zon B</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <p className="mb-1 text-xs text-accent">SKU-104</p>
          <p className="mb-5 text-sm font-semibold">Nitrilhandske M</p>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="mb-2 text-xs text-muted">Systemsaldo</p><p className="text-3xl font-semibold tabular-nums">48 <span className="text-xs font-normal text-muted">st</span></p></div>
            <div className="border-l border-white/10 pl-4"><p className="mb-2 text-xs text-cyan">Räknat antal</p><p className="text-3xl font-semibold tabular-nums text-cyan">46 <span className="text-xs font-normal">st</span></p></div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs"><span className="text-muted">Avvikelse</span><span className="rounded-md bg-amber-400/10 px-2 py-1 font-medium text-amber-200">−2 st</span></div>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-violet-400/30 bg-violet-500/15 p-3 text-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-400/20 text-cyan" aria-hidden="true">✓</span>
          <span>Räknat. Sparat. Full koll.</span>
        </div>
      </div>
      <figcaption className="mt-5 text-center text-xs text-muted">Exempel på den planerade inventeringsvyn.</figcaption>
    </figure>
  );
}
