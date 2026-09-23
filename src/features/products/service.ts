import "server-only";
import { Types } from "mongoose";
import { Product, type ProductRecord } from "@/models/product";
import { AppError, isDuplicateKey } from "@/lib/server/errors";
import { requireAdmin, type TenantContext } from "@/lib/server/tenant";
import { objectIdSchema } from "@/validation/organization";
import {
  productSchema,
  productUpdateSchema,
  productQuerySchema,
} from "@/validation/product";

function serialize(record: ProductRecord & { _id: Types.ObjectId }) {
  return {
    id: record._id.toString(),
    sku: record.sku,
    name: record.name,
    barcode: record.barcode,
    description: record.description,
    imageUrl: record.imageUrl,
    active: record.active,
  };
}
export async function listProducts(
  context: TenantContext,
  input: unknown = {},
) {
  const query = productQuerySchema.parse(input);
  const status = context.role === "admin" ? query.status : "active";
  const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filter = {
    organizationId: context.organizationId,
    ...(status === "all" ? {} : { active: status === "active" }),
    ...(query.q
      ? {
          $or: ["name", "sku", "barcode"].map((key) => ({
            [key]: { $regex: escaped, $options: "i" },
          })),
        }
      : {}),
  };
  const pageSize = 24;
  const total = await Product.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(query.page, pages);
  const records = await Product.find(filter)
    .sort({ name: 1, _id: 1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();
  return { items: records.map(serialize), total, page, pages };
}
export async function getProduct(context: TenantContext, id: string) {
  const record = await Product.findOne({
    _id: objectIdSchema.parse(id),
    organizationId: context.organizationId,
    ...(context.role !== "admin" ? { active: true } : {}),
  }).lean();
  if (!record)
    throw new AppError(
      404,
      "PRODUCT_NOT_FOUND",
      "Produkten kunde inte hittas.",
    );
  return serialize(record);
}
function conflict(error: unknown): never {
  if (isDuplicateKey(error))
    throw new AppError(
      409,
      "SKU_EXISTS",
      "Artikelnumret finns redan i företaget, även bland inaktiva produkter.",
    );
  throw error;
}
export async function createProduct(context: TenantContext, input: unknown) {
  requireAdmin(context);
  const data = productSchema.parse(input);
  try {
    return serialize(
      await Product.create({ ...data, organizationId: context.organizationId }),
    );
  } catch (error) {
    return conflict(error);
  }
}
export async function updateProduct(
  context: TenantContext,
  id: string,
  input: unknown,
) {
  requireAdmin(context);
  const data = productUpdateSchema.parse(input);
  try {
    const record = await Product.findOneAndUpdate(
      { _id: objectIdSchema.parse(id), organizationId: context.organizationId },
      { $set: data },
      { returnDocument: "after", runValidators: true },
    );
    if (!record)
      throw new AppError(
        404,
        "PRODUCT_NOT_FOUND",
        "Produkten kunde inte hittas.",
      );
    return serialize(record);
  } catch (error) {
    return conflict(error);
  }
}
