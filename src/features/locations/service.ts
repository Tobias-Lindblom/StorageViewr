import "server-only";
import { randomBytes } from "node:crypto";
import { Types, type ClientSession } from "mongoose";
import { Location, type LocationRecord } from "@/models/location";
import { Warehouse } from "@/models/warehouse";
import { AppError } from "@/lib/server/errors";
import { connectDb } from "@/lib/server/db";
import { requireAdmin, type TenantContext } from "@/lib/server/tenant";
import { objectIdSchema } from "@/validation/organization";
import {
  locationSchema,
  locationUpdateSchema,
  locationBatchSchema,
  locationCode,
  qrTokenSchema,
} from "@/validation/location";

function serialize(record: LocationRecord & { _id: Types.ObjectId }) {
  return {
    id: record._id.toString(),
    warehouseId: record.warehouseId.toString(),
    code: record.code,
    zone: record.zone,
    shelf: record.shelf,
    position: record.position,
    active: record.active,
    qrToken: record.qrToken,
  };
}
export async function listLocations(
  context: TenantContext,
  warehouseId?: string,
) {
  const records = await Location.find({
    organizationId: context.organizationId,
    ...(warehouseId ? { warehouseId: objectIdSchema.parse(warehouseId) } : {}),
    ...(context.role !== "admin" ? { active: true } : {}),
  })
    .sort({ active: -1, code: 1, _id: 1 })
    .lean();
  // Explicit tenant constraint also on referenced warehouses.
  const warehouses = await Warehouse.find({
    organizationId: context.organizationId,
    _id: { $in: records.map((record) => record.warehouseId) },
    ...(context.role !== "admin" ? { active: true } : {}),
  }).lean();
  const names = new Map(
    warehouses.map((warehouse) => [warehouse._id.toString(), warehouse.name]),
  );
  return records
    .filter((record) => names.has(record.warehouseId.toString()))
    .map((record) => ({
      ...serialize(record),
      warehouseName: names.get(record.warehouseId.toString())!,
    }));
}
export async function getLocation(context: TenantContext, id: string) {
  const record = await Location.findOne({
    _id: objectIdSchema.parse(id),
    organizationId: context.organizationId,
    ...(context.role !== "admin" ? { active: true } : {}),
  }).lean();
  if (!record)
    throw new AppError(
      404,
      "LOCATION_NOT_FOUND",
      "Lagerplatsen kunde inte hittas.",
    );
  const warehouse = await Warehouse.findOne({
    _id: record.warehouseId,
    organizationId: context.organizationId,
    ...(context.role !== "admin" ? { active: true } : {}),
  }).lean();
  if (!warehouse)
    throw new AppError(
      404,
      "LOCATION_NOT_FOUND",
      "Lagerplatsen kunde inte hittas.",
    );
  return {
    ...serialize(record),
    warehouseName: warehouse.name,
    warehouseActive: warehouse.active,
  };
}
export async function getLocationByToken(
  context: TenantContext,
  token: string,
) {
  const record = await Location.findOne({
    qrToken: qrTokenSchema.parse(token),
    organizationId: context.organizationId,
    active: true,
  }).lean();
  if (!record)
    throw new AppError(
      404,
      "LOCATION_NOT_FOUND",
      "Lagerplatsen kunde inte hittas i det valda företaget.",
    );
  const location = await getLocation(context, record._id.toString());
  if (!location.warehouseActive)
    throw new AppError(
      404,
      "LOCATION_NOT_FOUND",
      "Lagerplatsen är inte aktiv.",
    );
  return location;
}
async function lockWarehouse(
  context: TenantContext,
  warehouseId: string | Types.ObjectId,
  session: ClientSession,
) {
  const result = await Warehouse.updateOne(
    { _id: warehouseId, organizationId: context.organizationId, active: true },
    { $inc: { locationRevision: 1 } },
    { session },
  );
  if (!result.matchedCount)
    throw new AppError(
      404,
      "WAREHOUSE_NOT_FOUND",
      "Välj ett aktivt lager i ditt företag.",
    );
}
export async function createLocation(context: TenantContext, input: unknown) {
  requireAdmin(context);
  const data = locationSchema.parse(input);
  const db = await connectDb();
  return db.connection.transaction(async (session) => {
    await lockWarehouse(context, data.warehouseId, session);
    const [record] = await Location.create(
      [
        {
          ...data,
          code: locationCode(data),
          qrToken: randomBytes(24).toString("hex"),
          organizationId: context.organizationId,
        },
      ],
      { session },
    );
    return serialize(record);
  });
}
export async function createLocationBatch(
  context: TenantContext,
  input: unknown,
) {
  requireAdmin(context);
  const data = locationBatchSchema.parse(input);
  const db = await connectDb();
  return db.connection.transaction(async (session) => {
    await lockWarehouse(context, data.warehouseId, session);
    const records = Array.from({ length: data.count }, (_, index) => {
      const parts = {
        zone: data.zone,
        shelf: data.shelf,
        position: String(data.startPosition + index).padStart(2, "0"),
      };
      return {
        ...parts,
        code: locationCode(parts),
        warehouseId: data.warehouseId,
        organizationId: context.organizationId,
        qrToken: randomBytes(24).toString("hex"),
      };
    });
    return (await Location.insertMany(records, { session, ordered: true })).map(
      serialize,
    );
  });
}
export async function updateLocation(
  context: TenantContext,
  id: string,
  input: unknown,
) {
  requireAdmin(context);
  const locationId = objectIdSchema.parse(id);
  const data = locationUpdateSchema.parse(input);
  const db = await connectDb();
  return db.connection.transaction(async (session) => {
    const current = await Location.findOne({
      _id: locationId,
      organizationId: context.organizationId,
    }).session(session);
    if (!current)
      throw new AppError(
        404,
        "LOCATION_NOT_FOUND",
        "Lagerplatsen kunde inte hittas.",
      );
    await lockWarehouse(context, current.warehouseId, session);
    const record = await Location.findOneAndUpdate(
      { _id: locationId, organizationId: context.organizationId },
      { $set: { ...data, code: locationCode(data) } },
      { session, returnDocument: "after", runValidators: true },
    );
    if (!record)
      throw new AppError(
        404,
        "LOCATION_NOT_FOUND",
        "Lagerplatsen kunde inte hittas.",
      );
    return serialize(record);
  });
}
