"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/app-icon";
import { EmptyState } from "@/components/empty-state";
import { LocationFilters, type LocationFiltersValue } from "./location-filters";
import type { listLocations } from "./service";

export function LocationOverview({ locations, warehouses, warehouseId, admin, createAction, tools }: {
  locations: Awaited<ReturnType<typeof listLocations>>;
  warehouses: { id: string; name: string; active: boolean }[];
  warehouseId?: string;
  admin: boolean;
  createAction?: ReactNode;
  tools?: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [occupancy, setOccupancy] = useState<LocationFiltersValue["occupancy"]>("all");
  const selectedWarehouse = warehouses.find(warehouse => warehouse.id === warehouseId);
  const [status, setStatus] = useState<LocationFiltersValue["status"]>(admin && selectedWarehouse?.active === false ? "all" : "active");
  const normalized = query.trim().toLocaleLowerCase("sv");
  const matching = locations.filter(location =>
    (status === "all" || location.active === (status === "active")) &&
    (location.code + " " + location.warehouseName).toLocaleLowerCase("sv").includes(normalized));
  const counts = { all: matching.length, occupied: matching.filter(location => location.occupied).length,
    empty: matching.filter(location => !location.occupied).length };
  const visible = matching.filter(location => occupancy === "all" || location.occupied === (occupancy === "occupied"));
  const filtered = Boolean(query || warehouseId || occupancy !== "all" || status !== "active");
  function apply(value: LocationFiltersValue) {
    setOccupancy(value.occupancy);
    setStatus(value.status);
    if (pending || value.warehouseId !== (warehouseId ?? "")) startTransition(() => router.push(
      "/locations" + (value.warehouseId ? "?" + new URLSearchParams({ warehouseId: value.warehouseId }) : ""),
      { scroll: false },
    ));
  }
  function reset() {
    setQuery("");
    apply({ warehouseId: "", occupancy: "all", status: "active" });
  }
  return <section className="location-overview" aria-labelledby="locations-heading">
    <h1 id="locations-heading">Lagerplatser</h1>
    {selectedWarehouse && <div className="location-warehouse-scope">
      <Link href="/warehouses"><AppIcon name="chevron" width={14} height={14} />Lager</Link>
      <span>{selectedWarehouse.name}{!selectedWarehouse.active && <em>Inaktivt lager</em>}</span>
    </div>}
    <div className="location-search">
      <form className="location-search-field" role="search" aria-label="Sök lagerplatser" onSubmit={event => event.preventDefault()}>
        <button type="submit" aria-label="Sök lagerplatser"><AppIcon name="search" width={18} height={18} /></button>
        <label htmlFor="location-search" className="sr-only">Sök lagerplats eller lager</label>
        <input id="location-search" type="search" value={query} onChange={event => setQuery(event.target.value)}
          maxLength={100} placeholder="Sök lagerplats..." />
      </form>
      <LocationFilters value={{ warehouseId: warehouseId ?? "", occupancy, status }} warehouses={warehouses}
        admin={admin} tools={tools} onApply={apply} />
    </div>
    <nav aria-label="Filtrera lagerplatser efter beläggning" className="location-status-chips">
      {[
        { value: "all" as const, label: "Alla", count: counts.all },
        { value: "occupied" as const, label: "Upptagna", count: counts.occupied },
        { value: "empty" as const, label: "Tomma", count: counts.empty },
      ].map(item => <button key={item.value} type="button" aria-pressed={occupancy === item.value}
        className={"location-status-chip" + (occupancy === item.value ? " is-active" : "")}
        onClick={() => setOccupancy(item.value)}>
        {item.label} ({item.count.toLocaleString("sv-SE")})
      </button>)}
    </nav>
    <div className="location-list-toolbar">
      <p role="status" className="sr-only">{pending ? "Hämtar lagerplatser…" :
        visible.length + (visible.length === 1 ? " lagerplats" : " lagerplatser")}</p>
      {filtered && <button type="button" onClick={reset} className="location-clear-filter">Rensa filter</button>}
      {createAction}
    </div>
    <div aria-busy={pending} className={pending ? "opacity-60" : ""}>
      {visible.length ? <ul className="location-card-list">
        {visible.map(location => <li key={location.id} className="min-w-0">
          <Link href={"/locations/" + location.id} className="location-card">
            <span className="location-card-marker"><AppIcon name="location" width={28} height={28}
              fill="currentColor" strokeWidth={0} fillRule="evenodd" /></span>
            <span className="location-card-identity">
              <span className="location-card-code">{location.code}</span>
              <span className="location-card-warehouse">{location.warehouseName}</span>
              <span className="location-card-stats">
                <span>{location.productCount} {location.productCount === 1 ? "produkt" : "produkter"}</span>
                <span>{BigInt(location.totalQuantity).toLocaleString("sv-SE")} st</span>
              </span>
            </span>
            <span className={"location-occupancy-badge " + (!location.active ? "is-inactive" : location.occupied ? "is-occupied" : "is-empty")}>
              {!location.active ? "Inaktiv" : location.occupied ? "Upptagen" : "Tom"}
            </span>
          </Link>
        </li>)}
      </ul> : <EmptyState icon="location" title={selectedWarehouse && !locations.length ? "Inga lagerplatser i lagret" : filtered ? "Inga matchande lagerplatser" : "Inga lagerplatser ännu"}>
        {selectedWarehouse && !locations.length ? !selectedWarehouse.active
          ? "Lagret är inaktivt. Aktivera det från lagerkortets meny för att skapa platser."
          : admin ? "Lägg till din första lagerplats i detta lager." : "En administratör behöver lägga till lagerplatser i detta lager."
          : filtered ? "Prova en annan sökning eller ändra filtren." : admin
          ? warehouses.some(warehouse => warehouse.active) ? "Lägg till din första lagerplats för att komma igång." : "Börja med att skapa ett lager och lägg sedan till lagerplatser."
          : "En administratör behöver lägga till lagerplatser innan de visas här."}
      </EmptyState>}
    </div>
  </section>;
}
