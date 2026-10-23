"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppIcon } from "@/components/app-icon";

export type PickedProduct = { id: string; name: string; sku: string };
export function ProductPicker({ onSelect }: { onSelect: (product: PickedProduct) => void }) {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<PickedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: search, status: "active" });
        const response = await fetch("/api/products?" + params, { signal: controller.signal, cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message ?? "Produkterna kunde inte läsas.");
        if (!controller.signal.aborted) setProducts(result.data.items);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Produkterna kunde inte läsas.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search]);
  return (
    <div className="space-y-4">
      <label>Sök produkt
        <input type="search" autoFocus maxLength={100} value={search} placeholder="Produktnamn, SKU eller streckkod"
          onChange={event => { setSearch(event.target.value); setLoading(true); setError(""); }} />
      </label>
      {error ? <p role="alert" className="error">{error}</p> : loading ? <p role="status" className="text-sm text-muted">Söker produkter…</p> :
        products.length ? <div className="divide-y divide-line/60 overflow-hidden rounded-xl border border-line">
          {products.slice(0, 8).map(product => (
            <button key={product.id} type="button" onClick={() => onSelect(product)} className="flex min-h-14 w-full items-center gap-3 bg-canvas px-4 py-3 text-left hover:bg-surface-raised">
              <AppIcon name="product" className="shrink-0 text-cyan" />
              <span className="min-w-0"><span className="block wrap-break-word text-sm font-medium">{product.name}</span><span className="mt-1 block text-xs text-muted">SKU {product.sku}</span></span>
            </button>
          ))}
        </div> : <p role="status" className="text-sm text-muted">Inga aktiva produkter matchar sökningen.</p>}
      {!loading && products.length > 8 && <p className="text-xs text-muted">Sök för att begränsa urvalet.</p>}
      <Link href="/products" className="inline-flex min-h-11 items-center text-sm text-accent">Visa produktlistan</Link>
    </div>
  );
}
