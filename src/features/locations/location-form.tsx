"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client-api";
import { locationBatchSchema, locationCode } from "@/validation/location";
import type { getLocation } from "./service";

type WarehouseOption = { id: string; name: string };
export function LocationForm({ warehouses, warehouseId, initial }: {
  warehouses: WarehouseOption[]; warehouseId?: string; initial?: Awaited<ReturnType<typeof getLocation>>;
}) {
  const router = useRouter();
  const [zone, setZone] = useState(initial?.zone ?? "A");
  const [shelf, setShelf] = useState(initial?.shelf ?? "01");
  const [position, setPosition] = useState(initial?.position ?? "1");
  const [count, setCount] = useState("10");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const preview = locationBatchSchema.safeParse({
    warehouseId: initial?.warehouseId ?? warehouseId ?? warehouses[0]?.id,
    zone, shelf, startPosition: Number(position), count: initial ? 1 : Number(count),
  });
  const first = preview.success ? locationCode({ ...preview.data, position: String(preview.data.startPosition).padStart(2, "0") }) : "";
  const last = preview.success ? locationCode({ ...preview.data, position: String(preview.data.startPosition + preview.data.count - 1).padStart(2, "0") }) : "";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      if (initial) {
        await clientApi("/api/locations/" + initial.id, "PATCH", { zone, shelf, position, active: form.get("active") === "on" });
        router.push("/locations/" + initial.id);
      } else {
        const result = await clientApi<{ id: string }[]>("/api/locations/batch", "POST", {
          warehouseId: form.get("warehouseId"), zone, shelf, startPosition: Number(position), count: Number(count),
        });
        router.push(result.length === 1 ? "/locations/" + result[0].id : "/locations?warehouseId=" + form.get("warehouseId"));
      }
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Kunde inte spara lagerplatserna."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="panel max-w-2xl space-y-6">
    {initial ? <p className="text-sm text-muted">Lager: <strong className="text-foreground">{initial.warehouseName}</strong></p> :
      <label>Lager<select name="warehouseId" required defaultValue={warehouseId ?? warehouses[0]?.id}>{warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>}
    <div className="grid grid-cols-2 gap-4">
      <label>Zon<input name="zone" required maxLength={8} value={zone} onChange={event => setZone(event.target.value)} autoCapitalize="characters" /></label>
      <label>Hylla<input name="shelf" required inputMode="numeric" pattern="[0-9]{1,3}" maxLength={3} value={shelf} onChange={event => setShelf(event.target.value)} /></label>
      <label>{initial ? "Position" : "Första position"}<input name="position" required inputMode="numeric" pattern="[0-9]{1,3}" maxLength={3} value={position} onChange={event => setPosition(event.target.value)} /></label>
      {!initial && <label>Antal platser<input name="count" type="number" required min={1} max={100} step={1} value={count} onChange={event => setCount(event.target.value)} /></label>}
    </div>
    <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 p-4" aria-live="polite">
      <p className="mb-2 text-xs text-muted">{initial ? "Platskod" : "Platskoder som skapas"}</p>
      <p className="break-words font-mono text-sm text-accent">{first ? first === last ? first : first + " → " + last : "Ange giltig zon, hylla och position."}</p>
    </div>
    {initial && <><label className="flex min-h-13 items-center gap-3"><input className="!m-0 !h-5 !min-h-0 !w-5 accent-violet-500" type="checkbox" name="active" defaultChecked={initial.active} />Aktiv lagerplats</label><p className="text-xs leading-6 text-muted">QR-länken behålls när koden ändras. Skriv ut en ny etikett så att den synliga koden stämmer.</p></>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="flex flex-col gap-3 sm:flex-row"><button className="button" disabled={pending}>{pending ? "Sparar…" : initial ? "Spara lagerplats" : "Skapa lagerplatser"}</button><Link className="button-secondary" href={initial ? "/locations/" + initial.id : "/locations"}>Avbryt</Link></div>
  </form>;
}
