import "server-only";
import QRCode from "qrcode";
import { Location } from "@/models/location";
import { Warehouse } from "@/models/warehouse";
import { objectIdSchema } from "@/validation/organization";
import { qrTokenSchema } from "@/validation/location";
import type { TenantContext } from "@/lib/server/tenant";
import { AppError } from "@/lib/server/errors";

export function qrOrigin() {
  const configured = process.env.APP_URL;
  if (!configured) throw new AppError(503, "NOT_CONFIGURED", "Applikationens adress saknas.");
  const url = new URL(configured);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new AppError(503, "NOT_CONFIGURED", "Applikationens adress är ogiltig.");
  return url.origin;
}
export async function locationQr(token: string) {
  const url = qrOrigin() + "/location/" + qrTokenSchema.parse(token);
  const image = await QRCode.toDataURL(url, {
    width: 320, margin: 4, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" },
  });
  return { url, image };
}
export async function getLabels(context: TenantContext, warehouseId?: string) {
  const warehouses = await Warehouse.find({
    organizationId: context.organizationId, active: true,
    ...(warehouseId ? { _id: objectIdSchema.parse(warehouseId) } : {}),
  }).lean();
  if (warehouseId && !warehouses.length) throw new AppError(404, "WAREHOUSE_NOT_FOUND", "Lagret kunde inte hittas.");
  const names = new Map(warehouses.map(warehouse => [warehouse._id.toString(), warehouse.name]));
  const locations = await Location.find({
    organizationId: context.organizationId, warehouseId: { $in: warehouses.map(warehouse => warehouse._id) }, active: true,
  }).sort({ warehouseId: 1, code: 1 }).lean();
  const labels = [];
  // Bound QR encoding memory during larger print jobs.
  for (const location of locations) {
    labels.push({ id: location._id.toString(), code: location.code,
      warehouseName: names.get(location.warehouseId.toString())!, ...await locationQr(location.qrToken) });
  }
  return labels;
}
