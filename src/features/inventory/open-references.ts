import "server-only";
import { Types, type ClientSession } from "mongoose";
import type { TenantContext } from "@/lib/server/tenant";
import { AppError } from "@/lib/server/errors";
import { InventorySession } from "@/models/inventory-session";
import { InventorySessionLocation } from "@/models/inventory-session-location";
import { InventoryCount } from "@/models/inventory-count";
import { InventoryLevel } from "@/models/inventory-level";

export async function assertNoOpenInventory(
  context: TenantContext,
  reference: { productId?: Types.ObjectId; locationId?: Types.ObjectId },
  session: ClientSession,
) {
  const filter = { organizationId: context.organizationId };
  const inventories = await InventorySession.find({
    ...filter,
    status: "active",
  })
    .select("_id")
    .session(session)
    .lean();
  if (!inventories.length) return;
  const open = {
    ...filter,
    inventorySessionId: { $in: inventories.map((row) => row._id) },
  };
  let exists;
  if (reference.locationId) {
    exists = await InventorySessionLocation.exists({
      ...open,
      locationId: reference.locationId,
    }).session(session);
  } else if (reference.productId) {
    exists = await InventoryCount.exists({
      ...open,
      productId: reference.productId,
    }).session(session);
    if (!exists) {
      const levels = await InventoryLevel.find({
        ...filter,
        productId: reference.productId,
      })
        .select("locationId")
        .session(session)
        .lean();
      exists = await InventorySessionLocation.exists({
        ...open,
        locationId: { $in: levels.map((row) => row.locationId) },
      }).session(session);
    }
  }
  if (exists)
    throw new AppError(
      409,
      "OPEN_INVENTORY",
      "Objektet ingår i en pågående inventering. Genomför inventeringen innan du inaktiverar det.",
    );
}
