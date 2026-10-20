import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outputDirectory = path.resolve("public/icons");

function cubeMarkup(size, cubeScale, transparent = false) {
  const cubeWidth = size * cubeScale;
  const cubeHeight = cubeWidth * (26 / 24);
  const x = (size - cubeWidth) / 2;
  const y = (size - cubeHeight) / 2;
  const scale = cubeWidth / 24;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <radialGradient id="background" cx="72%" cy="18%" r="88%">
          <stop offset="0" stop-color="#211532"/>
          <stop offset="0.62" stop-color="#0d0a14"/>
          <stop offset="1" stop-color="#08070d"/>
        </radialGradient>
      </defs>
      ${transparent ? "" : `<rect width="${size}" height="${size}" fill="url(#background)"/>`}
      <g transform="translate(${x} ${y}) scale(${scale})">
        <path d="M12 1 23 7 12 13 1 7 12 1Z" fill="#aa88ff"/>
        <path d="M1 8 11.5 13.7V25L1 19V8Z" fill="#9254db"/>
        <path d="m12.5 13.7 10.5-5.7v11l-10.5 6V13.7Z" fill="#c6a4f5"/>
      </g>
    </svg>`;
}

const icons = [
  { name: "icon-32.png", size: 32, cubeScale: 0.72, transparent: true },
  { name: "apple-touch-icon.png", size: 180, cubeScale: 0.5 },
  { name: "icon-192.png", size: 192, cubeScale: 0.5 },
  { name: "icon-512.png", size: 512, cubeScale: 0.5 },
  { name: "maskable-512.png", size: 512, cubeScale: 0.5 },
];

await mkdir(outputDirectory, { recursive: true });
await Promise.all(
  icons.map(({ name, size, cubeScale, transparent }) =>
    sharp(Buffer.from(cubeMarkup(size, cubeScale, transparent)))
      .png({ compressionLevel: 9, palette: false })
      .toFile(path.join(outputDirectory, name)),
  ),
);

console.log(`Genererade ${icons.length} StorageViewr-ikoner i public/icons.`);
