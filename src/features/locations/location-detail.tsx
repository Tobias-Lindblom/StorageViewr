import Image from "next/image";
import Link from "next/link";
import { MaterialArrow } from "@/components/material-arrow";
import { AppIcon } from "@/components/app-icon";
import { StatusBadge } from "@/components/status-badge";
import { locationQr } from "./labels";
import type { getLocation } from "./service";
import type { TenantContext } from "@/lib/server/tenant";
import { StockPanel } from "@/features/inventory/stock-panel";
import { StartInventory } from "@/features/inventory/start-inventory";
import { inventoriesForLocation } from "@/features/scanner/service";
import { LocationEditorSheet } from "./location-editor-sheet";
import { DeleteLocation } from "./delete-location";

export async function LocationDetail({ location, admin, context }: {
  location: Awaited<ReturnType<typeof getLocation>>; admin: boolean; context: TenantContext;
}) {
  const active = location.active && location.warehouseActive;
  const [qr, inventories] = await Promise.all([
    active ? locationQr(location.qrToken) : Promise.resolve(null),
    active ? inventoriesForLocation(context, location.id) : Promise.resolve([]),
  ]);
  const inventoryAction = active ? <section className="mt-5" aria-label="Inventera plats">
    {inventories.length ? <div className="grid gap-2">{inventories.map(inventory =>
      <Link key={inventory.id} className="button w-full" href={"/inventories/" + inventory.id + "?location=" + location.id}>
        <AppIcon name="inventory" />{inventories.length === 1 ? "Inventera plats" : inventory.name}
      </Link>)}</div> : admin ?
      <StartInventory warehouses={[{ id: location.warehouseId, name: location.warehouseName }]}
        locations={[{ id: location.id, warehouseId: location.warehouseId, code: location.code }]}
        initialLocationIds={[location.id]} label="Inventera plats" defaultName={"Inventera " + location.code} /> :
      <p className="stock-card text-sm text-muted">En administratör behöver starta en inventering för platsen innan du kan räkna.</p>}
  </section> : undefined;
  return <>
    <Link href="/locations" className="mb-2 inline-flex min-h-10 items-center gap-2 text-sm text-accent">
      <MaterialArrow name="back" />Alla lagerplatser
    </Link>
    <header className="mb-5">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-accent"><AppIcon name="location" /></span>
        <div className="min-w-0 flex-1">
          <h1 className="mb-1! break-all text-2xl! sm:text-3xl!">{location.code}</h1>
          <p className="wrap-break-word text-sm text-muted">{location.warehouseName}</p>
        </div>
        <StatusBadge tone={active ? "success" : "neutral"}>{active ? "Aktiv" : "Inaktiv"}</StatusBadge>
      </div>
      <dl className="mt-4 flex flex-wrap gap-2 text-xs">
        {[["Zon", location.zone], ["Sektion", location.shelf], ["Position", location.position]].map(([label, value]) =>
          <div key={label} className="flex gap-1 rounded-full border border-line bg-surface-raised px-3 py-1.5">
            <dt className="text-muted">{label}</dt><dd className="break-all">{value}</dd>
          </div>)}
      </dl>
    </header>
    <StockPanel context={context} kind="location" id={location.id}
      label={location.warehouseName + " · " + location.code} active={active} inventoryAction={inventoryAction} />
    <details className="stock-card mt-7">
      <summary className="min-h-11 cursor-pointer text-sm font-medium">QR-kod och platsuppgifter</summary>
      {admin && location.warehouseActive && <LocationEditorSheet warehouses={[]} initial={location}
        label="Redigera plats" className="button-secondary w-full sm:w-auto" />}
      {qr && <div className="flex flex-col items-center gap-4 sm:flex-row">
        <Image src={qr.image} alt={"QR-kod för " + location.code} width={160} height={160}
          unoptimized className="h-auto w-40 max-w-full rounded-xl bg-white" />
        <p className="text-sm leading-6 text-muted">Skanna etiketten för att öppna platsen eller fortsätta en pågående inventering.</p>
      </div>}
    </details>
    {admin && <DeleteLocation locationId={location.id} code={location.code} />}
  </>;
}
