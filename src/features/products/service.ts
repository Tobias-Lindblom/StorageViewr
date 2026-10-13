import "server-only";
import { assertNoOpenInventory } from "@/features/inventory/open-references";
import { Types, type PipelineStage } from "mongoose";
import { productStockStages } from "./product-stock";
import { connectDb } from "@/lib/server/db";
import { prepareProductPhoto, saveProductPhoto } from "./photos";
import { InventoryLevel } from "@/models/inventory-level";
import { Product, type ProductRecord } from "@/models/product";
import { AppError, isDuplicateKey } from "@/lib/server/errors";
import { requireAdmin, type TenantContext } from "@/lib/server/tenant";
import { objectIdSchema } from "@/validation/organization";
import {
  productCreateRequestSchema,
  productUpdateRequestSchema,
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
    photoUrl: record.hasPhoto ? "/api/products/" + record._id + "/photo?v=" + record.updatedAt.getTime() : "",
    active: record.active,
  };
}
function productFilter(context: TenantContext, query: { q: string; status: "active" | "inactive" | "all" }) {
  const status = context.role === "admin" ? query.status : "active";
  const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filter = {
    organizationId: context.organizationId,
    ...(status === "all" ? {} : { active: status === "active" }),
    ...(query.q ? { $or: ["name", "sku", "barcode"].map(key => ({
      [key]: { $regex: escaped, $options: "i" },
    })) } : {}),
  };
  return filter;
}

export async function listProducts(context: TenantContext, input: unknown = {}) {
  const query = productQuerySchema.parse(input);
  const filter = productFilter(context, query);
  const pageSize = 24;
  type Row = ProductRecord & { _id: Types.ObjectId; totalQuantity: string; locationCount: number };
  const project: PipelineStage[] = [
    { $set: { totalQuantity: { $toString: "$stockTotal" } } },
    { $unset: ["stockSummary", "stockTotal"] },
  ];
  let total: number;
  let page: number;
  let records: Row[];
  if (query.stock === "all") {
    total = await Product.countDocuments(filter);
    page = Math.min(query.page, Math.max(1, Math.ceil(total / pageSize)));
    // For the normal list, only sum the products on the current page.
    records = await Product.aggregate<Row>([
      { $match: filter }, { $sort: { name: 1, _id: 1 } },
      { $skip: (page - 1) * pageSize }, { $limit: pageSize },
      ...productStockStages(context), ...project,
    ]);
  } else {
    const stockFilter = query.stock === "in-stock" ? { stockTotal: { $gt: 0 } } :
      query.stock === "empty" ? { stockTotal: 0 } : { locationCount: 0 };
    const pipeline: PipelineStage[] = [
      { $match: filter }, ...productStockStages(context), { $match: stockFilter },
    ];
    const window = (requested: number): PipelineStage.FacetPipelineStage[] => [
      { $sort: { name: 1, _id: 1 } }, { $skip: (requested - 1) * pageSize },
      { $limit: pageSize },
      { $set: { totalQuantity: { $toString: "$stockTotal" } } },
      { $unset: ["stockSummary", "stockTotal"] },
    ];
    const [result] = await Product.aggregate<{ count: { total: number }[]; items: Row[] }>([
      ...pipeline, { $facet: { count: [{ $count: "total" }], items: window(query.page) } },
    ]);
    total = result.count[0]?.total ?? 0;
    page = Math.min(query.page, Math.max(1, Math.ceil(total / pageSize)));
    records = page === query.page ? result.items : await Product.aggregate<Row>([...pipeline, ...window(page)]);
  }
  return { items: records.map(row => ({
    ...serialize(row), totalQuantity: row.totalQuantity, locationCount: row.locationCount,
  })), total, page, pages: Math.max(1, Math.ceil(total / pageSize)) };
}
export async function getProductStockCounts(context: TenantContext, input: unknown = {}) {
  const query = productQuerySchema.parse(input);
  const [counts] = await Product.aggregate<{ all: number; inStock: number; empty: number }>([
    { $match: productFilter(context, query) }, ...productStockStages(context),
    { $group: { _id: null, all: { $sum: 1 },
      inStock: { $sum: { $cond: [{ $gt: ["$stockTotal", 0] }, 1, 0] } },
      empty: { $sum: { $cond: [{ $eq: ["$stockTotal", 0] }, 1, 0] } },
    } },
    { $project: { _id: 0, all: 1, inStock: 1, empty: 1 } },
  ]);
  return counts ?? { all: 0, inStock: 0, empty: 0 };
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
  const { photo: imageInput, ...data } = productCreateRequestSchema.parse(input);
  const photo = await prepareProductPhoto(imageInput);
  try {
    if (!photo) return serialize(await Product.create({ ...data, organizationId: context.organizationId }));
    const db = await connectDb();
    return await db.connection.transaction(async session => {
      const [record] = await Product.create([{ ...data, imageUrl: "", hasPhoto: true, organizationId: context.organizationId }], { session });
      await saveProductPhoto(context, record._id, photo, session);
      return serialize(record);
    });
  } catch (error) { return conflict(error); }
}
export async function updateProduct(context: TenantContext, id: string, input: unknown) {
  requireAdmin(context);
  const { photo: imageInput, ...data } = productUpdateRequestSchema.parse(input);
  const productId = objectIdSchema.parse(id);
  // Check ownership before decoding an uploaded image.
  await getProduct(context, productId);
  const photo = await prepareProductPhoto(imageInput);
  const filter = { _id: productId, organizationId: context.organizationId };
  try {
    const db = await connectDb();
    return await db.connection.transaction(async session => {
      const record = await Product.findOneAndUpdate(filter,
        { $set: { ...data, ...(photo === undefined ? {} : { hasPhoto: photo !== null, imageUrl: "" }) }, $inc: { stockRevision: 1 } },
        { returnDocument: "after", runValidators: true, session });
      if (!record) throw new AppError(404, "PRODUCT_NOT_FOUND", "Produkten kunde inte hittas.");
      if (!data.active && await InventoryLevel.exists({ organizationId: context.organizationId, productId: record._id, quantity: { $gt: 0 } }).session(session)) {
        throw new AppError(409, "PRODUCT_HAS_STOCK", "Produkten har kvarvarande saldo. Nollställ saldot på dess lagerplatser innan du inaktiverar den.");
      }
      if (!data.active) await assertNoOpenInventory(context, { productId: record._id }, session);
      if (photo !== undefined) await saveProductPhoto(context, record._id, photo, session);
      return serialize(record);
    });
  } catch (error) { return conflict(error); }
}
