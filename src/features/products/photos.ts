import "server-only";
import sharp from "sharp";
import { Types, type ClientSession } from "mongoose";
import { Product } from "@/models/product";
import { ProductPhoto } from "@/models/product-photo";
import { AppError } from "@/lib/server/errors";
import type { TenantContext } from "@/lib/server/tenant";
import { objectIdSchema } from "@/validation/organization";
import { productPhotoSchema, PHOTO_MAX_UPLOAD_BYTES, PHOTO_MAX_STORED_BYTES } from "@/validation/product-photo";

export type PreparedProductPhoto = { detail: Buffer; thumbnail: Buffer };
export type ProductPhotoSize = "detail" | "thumbnail";

export async function prepareProductPhoto(input: unknown): Promise<PreparedProductPhoto | null | undefined> {
  const value = productPhotoSchema.parse(input);
  if (value === undefined || value === null) return value;
  const buffer = Buffer.from(value.slice(value.indexOf(",") + 1), "base64");
  if (buffer.length > PHOTO_MAX_UPLOAD_BYTES) throw new AppError(413, "PHOTO_TOO_LARGE", "Bilden är för stor. Välj en mindre bild.");
  try {
    const pipeline = sharp(buffer, { limitInputPixels: 50_000_000, failOn: "warning" });
    const metadata = await pipeline.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1) throw new Error("Unsupported image");
    // rotate applies camera orientation; default output omits EXIF/GPS metadata.
    const oriented = pipeline.rotate();
    const [detail, thumbnail] = await Promise.all([
      oriented.clone().resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 78 }).toBuffer(),
      oriented.clone().resize(320, 320, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 72 }).toBuffer(),
    ]);
    if (detail.length > PHOTO_MAX_STORED_BYTES || thumbnail.length > PHOTO_MAX_STORED_BYTES)
      throw new Error("Image output too large");
    return { detail, thumbnail };
  } catch {
    throw new AppError(400, "INVALID_PHOTO", "Bilden kunde inte läsas. Välj en vanlig JPEG-, PNG- eller WebP-bild.");
  }
}
export async function saveProductPhoto(
  context: TenantContext, productId: Types.ObjectId, data: PreparedProductPhoto | null, session: ClientSession,
) {
  const filter = { organizationId: context.organizationId, productId };
  if (data === null) await ProductPhoto.deleteOne(filter, { session });
  else await ProductPhoto.findOneAndUpdate(
    filter,
    { $set: { data: data.detail, thumbnailData: data.thumbnail } },
    { upsert: true, session, runValidators: true },
  );
}

export async function getProductPhotoAccess(context: TenantContext, id: string) {
  const productId = new Types.ObjectId(objectIdSchema.parse(id));
  const product = await Product.findOne({
    _id: productId,
    organizationId: context.organizationId,
    hasPhoto: true,
    ...(context.role === "admin" ? {} : { active: true }),
  }).select("updatedAt").lean();
  if (!product) throw new AppError(404, "PHOTO_NOT_FOUND", "Bilden kunde inte hittas.");
  return { productId, version: product.updatedAt.getTime() };
}

export async function readProductPhotoData(
  context: TenantContext,
  productId: Types.ObjectId,
  size: ProductPhotoSize,
) {
  const photo = await ProductPhoto.findOne({
    organizationId: context.organizationId,
    productId,
  }).select(size === "thumbnail" ? "+thumbnailData +data" : "+data");
  if (!photo) throw new AppError(404, "PHOTO_NOT_FOUND", "Bilden kunde inte hittas.");
  if (size === "thumbnail" && photo.thumbnailData)
    return Buffer.from(photo.thumbnailData);
  const detail = Buffer.from(photo.data);
  return size === "thumbnail"
    ? sharp(detail).resize(320, 320, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 72 }).toBuffer()
    : detail;
}

export async function readProductPhoto(
  context: TenantContext,
  id: string,
  size: ProductPhotoSize = "detail",
) {
  const access = await getProductPhotoAccess(context, id);
  return readProductPhotoData(context, access.productId, size);
}
