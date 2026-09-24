import { z } from "zod";

export const PHOTO_MAX_SOURCE_BYTES = 20_000_000;
export const PHOTO_MAX_UPLOAD_BYTES = 2_000_000;
export const PHOTO_MAX_STORED_BYTES = 1_000_000;
export const PHOTO_REQUEST_BYTES = 2_900_000;
export const productPhotoSchema = z.string().max(2_700_000)
  .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/, "Välj en bild i JPEG-, PNG- eller WebP-format.")
  .nullable().optional();
