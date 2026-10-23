import "server-only";
import sharp from "sharp";
import { AppError } from "@/lib/server/errors";

const prefix = "data:image/png;base64,";
const pngMagic = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function invalidSignature(message = "Signaturen kunde inte läsas. Skriv under igen."): never {
  throw new AppError(400, "INVALID_INVENTORY_SIGNATURE", message);
}

export async function normalizeInventorySignature(dataUrl: string) {
  if (!dataUrl.startsWith(prefix)) invalidSignature();

  const encoded = dataUrl.slice(prefix.length);
  const source = Buffer.from(encoded, "base64");
  if (
    !source.length ||
    source.length > 300_000 ||
    !source.subarray(0, pngMagic.length).equals(pngMagic)
  ) {
    invalidSignature("Signaturen är ogiltig eller för stor. Skriv under igen.");
  }

  try {
    const image = sharp(source, {
      failOn: "error",
      limitInputPixels: 2_000_000,
    });
    const [metadata, statistics] = await Promise.all([
      image.metadata(),
      image.clone().stats(),
    ]);
    const alpha = metadata.hasAlpha
      ? statistics.channels[statistics.channels.length - 1]
      : undefined;
    if (
      metadata.format !== "png" ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > 2_000 ||
      metadata.height > 1_000 ||
      (alpha && alpha.max === 0)
    ) {
      invalidSignature();
    }

    return await image
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize({
        width: 1_200,
        height: 400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png({ compressionLevel: 9 })
      .toBuffer();
  } catch (error) {
    if (error instanceof AppError) throw error;
    invalidSignature();
  }
}
