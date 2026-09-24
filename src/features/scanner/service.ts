import "server-only";
import { AppError } from "@/lib/server/errors";
import type { TenantContext } from "@/lib/server/tenant";
import { Location } from "@/models/location";
import { InventorySession } from "@/models/inventory-session";
import { InventorySessionLocation } from "@/models/inventory-session-location";
import { getLocation, getLocationByToken } from "@/features/locations/service";
import { qrOrigin } from "@/features/locations/labels";
import { getInventory } from "@/features/inventory/session-queries";
import { scanLocationSchema } from "@/validation/scan";
import { qrTokenSchema } from "@/validation/location";

export function readLocationToken(input: string) {
  const origin = qrOrigin();
  let url: URL;
  try { url = new URL(input, origin); }
  catch { throw new AppError(400, "INVALID_QR", "QR-koden är inte en platskod från StorageViewr."); }
  const match = /^\/location\/([a-f0-9]{48})\/?$/.exec(url.pathname);
  if (url.origin !== origin || url.username || url.password || url.search || url.hash || !match) {
    throw new AppError(400, "INVALID_QR", "Skanna en QR-etikett för en lagerplats i StorageViewr.");
  }
  return qrTokenSchema.parse(match[1]);
}

export async function resolveInventoryLocation(context: TenantContext, inventoryId: string, input: unknown) {
  const data = scanLocationSchema.parse(input);
  const inventory = await getInventory(context, inventoryId);
  if (inventory.status !== "active") throw new AppError(409, "INVENTORY_COMPLETED", "Inventeringen är avslutad. Välj en pågående inventering.");
  let location;
  if ("qr" in data) {
    location = await getLocationByToken(context, readLocationToken(data.qr));
  } else {
    const record = await Location.findOne({ organizationId: context.organizationId, warehouseId: inventory.warehouseId, code: data.code, active: true }).lean();
    if (!record) throw new AppError(404, "LOCATION_NOT_FOUND", "Platskoden kunde inte hittas i inventeringens lager.");
    location = await getLocation(context, String(record._id));
  }
  if (!location.active || !location.warehouseActive || location.warehouseId !== inventory.warehouseId || !inventory.places.some(place => place.id === location.id)) {
    throw new AppError(404, "LOCATION_NOT_IN_SCOPE", "Platsen ingår inte i den här inventeringen. Kontrollera etiketten och valt lager.");
  }
  if (data.locationId && location.id !== data.locationId.toLowerCase()) {
    throw new AppError(409, "WRONG_LOCATION", "QR-koden eller platskoden hör till en annan plats. Skanna etiketten för platsen du valt.");
  }
  return { inventory, locationId: location.id };
}

export async function inventoriesForLocation(context: TenantContext, locationId: string) {
  const location = await getLocation(context, locationId);
  if (!location.active || !location.warehouseActive) return [];
  const filter = { organizationId: context.organizationId };
  const scopes = await InventorySessionLocation.find({ ...filter, locationId: location.id }).select("inventorySessionId").lean();
  const inventories = await InventorySession.find({ ...filter, _id: { $in: scopes.map(scope => scope.inventorySessionId) },
    warehouseId: location.warehouseId, status: "active" }).sort({ startedAt: -1, _id: -1 }).lean();
  return inventories.map(row => ({ id: String(row._id), name: row.name }));
}
