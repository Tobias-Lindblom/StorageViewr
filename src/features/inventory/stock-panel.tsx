import type { ReactNode } from "react";
import { Product } from "@/models/product";
import { listLocations } from "@/features/locations/service";
import type { TenantContext } from "@/lib/server/tenant";
import { listStock, listMovements } from "./service";
import { getVerification } from "./verification";
import { StockSummary } from "@/components/stock-summary";
import { InventoryVerification } from "@/components/inventory-verification";
import { MovementList } from "@/components/movement-list";
import { StockSection } from "./stock-section";
import { ProductStockSummary } from "@/features/products/product-stock-summary";
import { ProductMovementList } from "@/features/products/product-movement-list";

export async function StockPanel({
  context,
  kind,
  id,
  label,
  active,
  inventoryAction,
  productHeader,
}: {
  context: TenantContext;
  kind: "product" | "location";
  id: string;
  label: string;
  active: boolean;
  inventoryAction?: ReactNode;
  productHeader?: (count: number) => ReactNode;
}) {
  const data = await listStock(
    context,
    kind === "product" ? { productId: id } : { locationId: id },
  );
  const scope = kind === "product" ? { productId: id } : { locationId: id };
  const [verification, movements] = await Promise.all([
    getVerification(context, scope, data),
    context.role === "admin" ? listMovements(context, scope) : Promise.resolve(null),
  ]);
  const operable = active;
  const locations = operable
    ? await listLocations({ ...context, role: "warehouse" })
    : [];
  const transferLocations = locations.map((row) => ({
    id: row.id,
    label: row.warehouseName + " · " + row.code,
  }));
  const choices =
    kind === "product"
      ? transferLocations
      : !operable
        ? []
        : (
            await Product.find({
              organizationId: context.organizationId,
              active: true,
            })
              .select("name sku")
              .sort({ name: 1, _id: 1 })
              .lean()
          ).map((row) => ({
            id: String(row._id),
            label: row.name + " · " + row.sku,
          }));
  return (
    <>
    {productHeader?.(data.items.length)}
    {kind === "product" ? <ProductStockSummary total={data.total} verification={verification} /> : <>
      <StockSummary total={data.total} count={data.items.length} kind={kind} />
      <InventoryVerification data={verification} />
    </>}
    {inventoryAction}
    <div className={"grid items-start gap-x-7 " + (movements ? "xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]" : "")}>
    <StockSection
      data={data}
      scope={{ kind, id, label }}
      choices={choices}
      transferLocations={transferLocations}
      operable={operable}
      admin={context.role === "admin"}
    />
    {movements && (kind === "product" ? <ProductMovementList items={movements.items} href={"/inventory/history?productId=" + id} /> :
      <MovementList items={movements.items.slice(0, 5)} href={"/inventory/history?locationId=" + id} title="Senaste aktivitet" />)}
    </div>
    </>
  );
}
