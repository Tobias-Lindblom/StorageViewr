"use client";
import { MaterialArrow } from "@/components/material-arrow";


import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/app-icon";
import type { listLocations } from "./service";

type Locations = Awaited<ReturnType<typeof listLocations>>;
type ShelfGroup = { key: string; zone: string; shelf: string; locations: Locations };
type WarehouseGroup = { id: string; name: string; shelves: Map<string, ShelfGroup> };
const collator = new Intl.Collator("sv", { numeric: true });

function groupLocations(locations: Locations) {
  const warehouses = new Map<string, WarehouseGroup>();
  for (const location of locations) {
    let warehouse = warehouses.get(location.warehouseId);
    if (!warehouse) {
      warehouse = { id: location.warehouseId, name: location.warehouseName, shelves: new Map() };
      warehouses.set(location.warehouseId, warehouse);
    }
    const key = location.zone + "-" + location.shelf;
    let shelf = warehouse.shelves.get(key);
    if (!shelf) {
      shelf = { key, zone: location.zone, shelf: location.shelf, locations: [] };
      warehouse.shelves.set(key, shelf);
    }
    shelf.locations.push(location);
  }
  return [...warehouses.values()]
    .sort((a, b) => collator.compare(a.name, b.name) || collator.compare(a.id, b.id))
    .map(warehouse => ({
      ...warehouse,
      shelves: [...warehouse.shelves.values()]
        .sort((a, b) => collator.compare(a.zone, b.zone) || collator.compare(a.shelf, b.shelf))
        .map(shelf => ({ ...shelf, locations: shelf.locations.sort((a, b) => collator.compare(a.position, b.position)) })),
    }));
}

export function LocationList({ locations, warehouses, warehouseId, admin }: {
  locations: Locations;
  warehouses?: { id: string; name: string; active: boolean }[];
  warehouseId?: string;
  admin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("sv");
  const filtered = locations.filter(location =>
    (location.code + " " + location.warehouseName).toLocaleLowerCase("sv").includes(normalized));
  const groups = groupLocations(filtered);
  const shelfCount = groups.reduce((count, warehouse) => count + warehouse.shelves.length, 0);

  return (
    <div>
      <div className={warehouses ? "mb-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]" : "mb-5 max-w-lg"}>
        {warehouses && <div className="min-w-0">
          <label htmlFor="location-warehouse">Lager</label>
          <select id="location-warehouse" value={warehouseId ?? ""} disabled={pending} onChange={event => {
            const id = event.target.value;
            startTransition(() => router.push("/locations" + (id ? "?warehouseId=" + id : ""), { scroll: false }));
          }}>
            <option value="">Alla lager</option>
            {warehouses.map(warehouse => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}{warehouse.active ? "" : " (inaktivt)"}
              </option>
            ))}
          </select>
        </div>}
        <label className="min-w-0">
          Sök lagerplats
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Platskod eller lagernamn" />
        </label>
      </div>

      <p className="mb-5 text-xs text-muted" role="status">
        {pending ? "Hämtar lagerplatser…" : (
          <>{normalized ? filtered.length + " av " + locations.length : filtered.length} {filtered.length === 1 && !normalized ? "plats" : "platser"} · {shelfCount} {shelfCount === 1 ? "sektion" : "sektioner"}</>
        )}
      </p>

      <div aria-busy={pending} className={pending ? "space-y-8 opacity-60" : "space-y-8"}>
        {groups.map(warehouse => (
          <section key={warehouse.id} aria-labelledby={"warehouse-" + warehouse.id}>
            <div className="mb-3 flex min-w-0 items-center gap-2 text-muted">
              <AppIcon name="warehouse" className="shrink-0" width={18} height={18} />
              <h2 id={"warehouse-" + warehouse.id} className="mb-0! min-w-0 break-words text-sm font-medium">{warehouse.name}</h2>
            </div>
            <div className="space-y-3">
              {warehouse.shelves.map(shelf => (
                <details key={shelf.key + ":" + normalized} open={normalized.length > 0} className="group rounded-2xl border border-line bg-surface">
                  <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan sm:px-5 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-base font-semibold">{shelf.key}</h3>
                      <p className="mt-1 text-xs text-muted">Zon {shelf.zone} · Sektion {shelf.shelf}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted">{shelf.locations.length} {shelf.locations.length === 1 ? "plats" : "platser"}</span>
                    <MaterialArrow name="expand" className="text-accent transition-transform group-open:rotate-180" />
                  </summary>
                  <ul className="divide-y divide-line/60 border-t border-line/60 px-4 pb-2 sm:px-5">
                    {shelf.locations.map(location => (
                      <li key={location.id} className="min-w-0">
                        <Link href={"/locations/" + location.id} className="flex min-h-16 items-center justify-between gap-3 rounded-lg px-2 py-3 transition hover:bg-surface-raised">
                          <span className="min-w-0">
                            <span className="block break-all text-sm font-medium tabular-nums">{location.code}</span>
                            {!location.active && <span className="mt-1 block text-xs text-amber-200">Inaktiv</span>}
                          </span>
                          <span aria-hidden="true" className="shrink-0 text-accent"><MaterialArrow name="forward" /></span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="border-t border-line py-8">
          <h2 className="mb-2! text-lg">{locations.length ? "Inga matchande lagerplatser" : "Inga lagerplatser ännu"}</h2>
          <p className="max-w-md text-sm leading-7 text-muted">
            {locations.length
              ? "Prova en annan platskod eller ett annat lagernamn."
              : admin ? "Skapa platser så samlas de här efter lager, zon och sektion." : "En administratör behöver lägga till lagerplatser innan de visas här."}
          </p>
          {query && <button type="button" className="mt-3 min-h-13 text-sm text-cyan" onClick={() => setQuery("")}>Rensa sökning</button>}
        </div>
      )}
    </div>
  );
}
