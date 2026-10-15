import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import { EmptyState } from "@/components/empty-state";
import { WarehouseEditorSheet } from "./warehouse-editor-sheet";
import { WarehouseCardMenu } from "./warehouse-card-menu";
import type { listWarehouses } from "./service";

export function WarehouseOverview({ warehouses, admin }: {
  warehouses: Awaited<ReturnType<typeof listWarehouses>>;
  admin: boolean;
}) {
  return <section className="product-overview warehouse-overview" aria-labelledby="warehouse-heading">
    <h1 id="warehouse-heading">Lager</h1>
    <div className="warehouse-list-toolbar">
      <p role="status">{warehouses.length.toLocaleString("sv-SE")} lager</p>
      {admin && <WarehouseEditorSheet className="product-create warehouse-create"
        label={<><span aria-hidden="true">+</span> Lägg till lager</>} />}
    </div>
    {warehouses.length ? <ol className="warehouse-card-list">
      {warehouses.map(warehouse => <li key={warehouse.id} className="warehouse-card-row">
        <Link href={"/locations?" + new URLSearchParams({ warehouseId: warehouse.id })} className="warehouse-card">
          <span className="warehouse-card-marker"><AppIcon name="warehouse" width={23} height={23} /></span>
          <span className="warehouse-card-identity">
            <strong>{warehouse.name}</strong>
            <span className="warehouse-card-code">{warehouse.code}</span>
            <span className="warehouse-card-count">
              {warehouse.locationCount.toLocaleString("sv-SE")} {warehouse.locationCount === 1 ? "aktiv plats" : "aktiva platser"}
            </span>
          </span>
          <span className={"warehouse-card-status" + (warehouse.active ? " is-active" : "")}>
            {warehouse.active ? "Aktivt" : "Inaktivt"}
          </span>
          <AppIcon name="chevron" width={16} height={16} className="warehouse-card-arrow" />
        </Link>
        {admin && <WarehouseCardMenu warehouse={warehouse} />}
      </li>)}
    </ol> : <EmptyState title={admin ? "Inga lager ännu" : "Inga aktiva lager"}>
      {admin ? "Lägg till ditt första lager och börja skapa lagerplatser."
        : "En administratör kan lägga till lager och lagerplatser."}
    </EmptyState>}
  </section>;
}
