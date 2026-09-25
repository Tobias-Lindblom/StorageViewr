import { Product } from "@/models/product";
import { listLocations } from "@/features/locations/service";
import type { TenantContext } from "@/lib/server/tenant";
import { listStock } from "./service";
import { StockSection } from "./stock-section";

export async function StockPanel({
  context,
  kind,
  id,
  label,
  active,
}: {
  context: TenantContext;
  kind: "product" | "location";
  id: string;
  label: string;
  active: boolean;
}) {
  const data = await listStock(
    context,
    kind === "product" ? { productId: id } : { locationId: id },
  );
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
    <StockSection
      data={data}
      scope={{ kind, id, label }}
      choices={choices}
      transferLocations={transferLocations}
      operable={operable}
      admin={context.role === "admin"}
    />
  );
}
