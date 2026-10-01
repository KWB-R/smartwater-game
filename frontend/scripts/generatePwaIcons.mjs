import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const APP_ICON_PNG = path.resolve(
  root,
  "src/internal_assets/icons/Icon_AppIcon.png",
);
const PUBLIC_DIR = path.resolve(root, "public");

const PWA_ICON_SIZES = [180, 192, 512];

/**
 * Skaliert das App-Icon für PWA / Home-Screen (PNG 180 iOS, 192+512 Android).
 */
export async function generatePwaIcons() {
  if (!fs.existsSync(APP_ICON_PNG)) {
    throw new Error(`App-Icon fehlt: ${APP_ICON_PNG}`);
  }

  fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  await Promise.all(
    PWA_ICON_SIZES.map((size) =>
      sharp(APP_ICON_PNG)
        .resize(size, size, { fit: "cover" })
        .png()
        .toFile(path.join(PUBLIC_DIR, `pwa-icon-${size}.png`)),
    ),
  );
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  await generatePwaIcons();
}
