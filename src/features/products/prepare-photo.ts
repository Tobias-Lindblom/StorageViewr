import { PHOTO_MAX_SOURCE_BYTES, PHOTO_MAX_UPLOAD_BYTES } from "@/validation/product-photo";

export async function preparePhotoForUpload(file: File): Promise<string> {
  if (file.size > PHOTO_MAX_SOURCE_BYTES) throw new Error("Bilden får vara högst 20 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Välj en JPEG-, PNG- eller WebP-bild. Om fotot är i HEIC-format, ta ett nytt foto eller spara det som JPEG.");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 50_000_000) {
      throw new Error("Bilden har för hög upplösning. Välj en mindre bild.");
    }
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Kunde inte förbereda bilden. Försök igen.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.55]) {
      const data = canvas.toDataURL("image/jpeg", quality);
      if ((data.length - data.indexOf(",") - 1) * 0.75 <= PHOTO_MAX_UPLOAD_BYTES) return data;
    }
    throw new Error("Bilden är för stor. Välj en mindre bild.");
  } catch (error) {
    if (error instanceof Error && !(error instanceof DOMException)) throw error;
    throw new Error("Bilden kunde inte läsas. Prova ett nytt foto eller en JPEG-bild.");
  } finally { URL.revokeObjectURL(url); }
}
