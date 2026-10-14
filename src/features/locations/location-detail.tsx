import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import { locationQr } from "./labels";
import type { getLocation } from "./service";
import type { TenantContext } from "@/lib/server/tenant";
import { StockPanel } from "@/features/inventory/stock-panel";
import { StartInventory } from "@/features/inventory/start-inventory";
import { inventoriesForLocation } from "@/features/scanner/service";
import { LocationEditorSheet } from "./location-editor-sheet";
import { LocationDetailsMenu } from "./location-details-menu";

export async function LocationDetail({ location, admin, context }: {
  location: Awaited<ReturnType<typeof getLocation>>; admin: boolean; context: TenantContext;
}) {
  const active = location.active && location.warehouseActive;
  const [qr, inventories] = await Promise.all([
    active ? locationQr(location.qrToken) : Promise.resolve(null),
    active ? inventoriesForLocation(context, location.id) : Promise.resolve([]),
  ]);
  const inventoryAction = active ? <div className="location-inventory-block">
    {inventories.length ? <div className="grid gap-2">{inventories.map(inventory =>
      <Link key={inventory.id} className="location-inventory-action" href={"/inventories/" + inventory.id + "?location=" + location.id}>
        <AppIcon name="inventory" width={16} height={16} />{inventories.length === 1 ? "Inventera plats" : inventory.name}
      </Link>)}</div> : admin ?
      <StartInventory warehouses={[{ id: location.warehouseId, name: location.warehouseName }]}
        locations={[{ id: location.id, warehouseId: location.warehouseId, code: location.code }]}
        initialLocationIds={[location.id]} label={<><AppIcon name="inventory" width={16} height={16} />Inventera plats</>}
        defaultName={"Inventera " + location.code} className="location-inventory-action" /> :
      <p className="location-inventory-note">En administratör behöver starta en inventering för platsen innan du kan räkna.</p>}
  </div> : undefined;
  return <article className="location-detail" aria-labelledby="location-heading">
    <div className="product-detail-toolbar">
      <Link href="/locations" className="product-back"><AppIcon name="chevron" width={16} height={16} />Tillbaka</Link>
      <LocationDetailsMenu location={location} qr={qr} admin={admin} />
    </div>
    <header className="location-detail-header">
      <div className="location-detail-identity-row">
        <span className="location-detail-marker"><AppIcon name="location" width={30} height={30} fill="currentColor" strokeWidth={0} fillRule="evenodd" /></span>
        <div className="location-detail-identity">
          <h1 id="location-heading">{location.code}</h1>
          <p>{location.warehouseName}</p>
        </div>
        {admin && location.warehouseActive && <LocationEditorSheet warehouses={[]} initial={location}
          label="Redigera plats" className="location-edit-action" />}
      </div>
      <dl className="location-detail-tags">
        {[["Zon", location.zone], ["Sektion", location.shelf], ["Position", location.position]].map(([label, value]) =>
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        {!active && <div className="is-inactive"><dt className="sr-only">Status</dt><dd>Inaktiv</dd></div>}
      </dl>
    </header>
    <StockPanel context={context} kind="location" id={location.id}
      label={location.warehouseName + " · " + location.code} active={active} inventoryAction={inventoryAction} />
  </article>;
}
