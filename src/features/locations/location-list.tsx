"use client";
import { useState } from "react";
import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import type { listLocations } from "./service";

export function LocationList({ locations }: { locations: Awaited<ReturnType<typeof listLocations>> }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("sv");
  const filtered = locations.filter(location => (location.code + " " + location.warehouseName).toLocaleLowerCase("sv").includes(normalized));
  return <div>
    <label className="mb-5 block max-w-md">Sök lagerplats<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Platskod eller lagernamn" /></label>
    <p className="mb-4 text-xs text-muted" role="status">{filtered.length} av {locations.length} platser</p>
    <div className="grid gap-3 sm:grid-cols-2">
      {filtered.map(location => <Link key={location.id} href={"/locations/" + location.id} className="flex min-h-24 min-w-0 items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:border-accent/60">
        <span className="rounded-xl bg-violet-500/10 p-3 text-accent"><AppIcon name="location" /></span>
        <div className="min-w-0 flex-1"><p className="break-words font-semibold">{location.code}</p><p className="mt-1 truncate text-xs text-muted">{location.warehouseName}</p>{!location.active && <span className="text-xs text-amber-200">Inaktiv</span>}</div><span aria-hidden="true" className="text-muted">→</span>
      </Link>)}
    </div>
    {filtered.length === 0 && <p className="panel text-sm text-muted">Inga lagerplatser matchar sökningen.</p>}
  </div>;
}
