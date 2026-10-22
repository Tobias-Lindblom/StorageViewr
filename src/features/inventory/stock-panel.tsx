import type { ReactNode } from "react";
import { Product } from "@/models/product";
import { listLocations } from "@/features/locations/service";
import type { TenantContext } from "@/lib/server/tenant";
import { listStock, listMovements } from "./service";
import { getVerification } from "./verification";
import { StockSection } from "./stock-section";
import { ProductStockSummary } from "@/features/products/product-stock-summary";
import { ProductMovementList } from "@/features/products/product-movement-list";
import { LocationStockSummary } from "@/features/locations/location-stock-summary";
import { LocationVerification } from "@/features/locations/location-verification";
import { RecentActivity } from "@/features/dashboard/recent-activity";
import { getDashboardActivity } from "@/features/dashboard/activity";

export async function StockPanel({
  context,
  kind,
  id,
  label,
  active,
  inventoryAction,
  productHeader,
  unitValue = null,
}: {
  context: TenantContext;
  kind: "product" | "location";
  id: string;
  label: string;
  active: boolean;
  inventoryAction?: ReactNode;
  productHeader?: (count: number) => ReactNode;
  unitValue?: string | null;
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
  const [locations, activity] = await Promise.all([
    operable ? listLocations({ ...context, role: "warehouse" }) : Promise.resolve([]),
    kind === "location" ? getDashboardActivity(context, { locationId: id, movements: movements?.items ?? [] }) : Promise.resolve(null),
  ]);
  const locationChoices = locations.map((row) => ({
    id: row.id,
    label: row.warehouseName + " · " + row.code,
  }));
  const choices =
    kind === "product"
      ? locationChoices
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
    {kind === "product" ? <ProductStockSummary total={data.total} verification={verification} unitValue={unitValue} admin={context.role === "admin"} /> : <>
      <LocationStockSummary total={data.total} count={data.items.length} />
      <LocationVerification data={verification} admin={context.role === "admin"} />
    </>}
    <div className={"grid items-start gap-x-7 " + (movements ? "xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]" : "")}>
    <StockSection
      data={data}
      scope={{ kind, id, label }}
      choices={choices}
      operable={operable}
      admin={context.role === "admin"}
      inventoryAction={inventoryAction}
    />
    {kind === "product" && movements && <ProductMovementList items={movements.items} href={"/inventory/history?productId=" + id} />}
    {activity && <RecentActivity items={activity} admin={context.role === "admin"} compactLocation
      href={context.role === "admin" ? "/inventory/history?locationId=" + id : "/inventories/completed"} />}
    </div>
    </>
  );
}
