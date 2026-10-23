import type { TenantContext } from "../../src/lib/server/tenant";
import { placeProduct, registerStockMovement } from "../../src/features/inventory/service";

export function correctStockForTest(context: TenantContext, input: {
  productId: string;
  locationId: string;
  quantity: number;
  expectedVersion: number | null;
  reason: string;
}) {
  if (input.expectedVersion === null && input.quantity === 0)
    return placeProduct(context, { productId: input.productId, locationId: input.locationId });
  return registerStockMovement(context, { type: "CORRECTION", ...input });
}
