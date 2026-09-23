import "server-only";
import { Types } from "mongoose";
import { Warehouse, type WarehouseRecord } from "@/models/warehouse";
import { Location } from "@/models/location";
import { connectDb } from "@/lib/server/db";
import { AppError } from "@/lib/server/errors";
import { requireAdmin, type TenantContext } from "@/lib/server/tenant";
import { objectIdSchema } from "@/validation/organization";
import { warehouseSchema, warehouseUpdateSchema } from "@/validation/warehouse";

function serialize(record: WarehouseRecord & { _id: Types.ObjectId }) {
  return {
    id: record._id.toString(),
    name: record.name,
    code: record.code,
    address: record.address,
    active: record.active,
    updatedAt: record.updatedAt.toISOString(),
  };
}
export async function listWarehouses(context: TenantContext) {
  const filter = {
    organizationId: context.organizationId,
    ...(context.role !== "admin" ? { active: true } : {}),
  };
  const [warehouses, counts] = await Promise.all([
    Warehouse.find(filter).sort({ active: -1, name: 1, _id: 1 }).lean(),
    Location.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { organizationId: context.organizationId, active: true } },
      { $group: { _id: "$warehouseId", count: { $sum: 1 } } },
    ]),
  ]);
  const byWarehouse = new Map(
    counts.map((item) => [item._id.toString(), item.count]),
  );
  return warehouses.map((record) => ({
    ...serialize(record),
    locationCount: byWarehouse.get(record._id.toString()) ?? 0,
  }));
}
export async function getWarehouse(context: TenantContext, id: string) {
  const record = await Warehouse.findOne({
    _id: objectIdSchema.parse(id),
    organizationId: context.organizationId,
    ...(context.role !== "admin" ? { active: true } : {}),
  }).lean();
  if (!record)
    throw new AppError(404, "WAREHOUSE_NOT_FOUND", "Lagret kunde inte hittas.");
  return serialize(record);
}
export async function createWarehouse(context: TenantContext, input: unknown) {
  requireAdmin(context);
  const data = warehouseSchema.parse(input);
  return serialize(
    await Warehouse.create({ ...data, organizationId: context.organizationId }),
  );
}
export async function updateWarehouse(
  context: TenantContext,
  id: string,
  input: unknown,
) {
  requireAdmin(context);
  const warehouseId = objectIdSchema.parse(id);
  const data = warehouseUpdateSchema.parse(input);
  const db = await connectDb();
  return db.connection.transaction(async (session) => {
    const record = await Warehouse.findOneAndUpdate(
      { _id: warehouseId, organizationId: context.organizationId },
      { $set: data, $inc: { locationRevision: 1 } },
      { session, returnDocument: "after", runValidators: true },
    );
    if (!record)
      throw new AppError(
        404,
        "WAREHOUSE_NOT_FOUND",
        "Lagret kunde inte hittas.",
      );
    if (
      !data.active &&
      (await Location.exists({
        organizationId: context.organizationId,
        warehouseId,
        active: true,
      }).session(session))
    ) {
      throw new AppError(
        409,
        "WAREHOUSE_HAS_ACTIVE_LOCATIONS",
        "Inaktivera lagrets aktiva platser innan du inaktiverar lagret.",
      );
    }
    return serialize(record);
  });
}
