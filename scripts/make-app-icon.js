/**
 * Genere racewolf.ico pour la barre des taches / titre Electron (Windows).
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const toIco = require("to-ico");

const SRC = path.join(__dirname, "../public/assets/racewolf-logo.png");
const OUT_DIR = path.join(__dirname, "../electron/assets");
const ICO = path.join(OUT_DIR, "racewolf.ico");
const PNG = path.join(OUT_DIR, "racewolf.png");
const SIZES = [16, 24, 32, 48, 64, 128, 256];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const images = await Promise.all(
    SIZES.map((size) =>
      sharp(SRC)
        .resize(size, size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer(),
    ),
  );

  const icoBuffer = await toIco(images);
  fs.writeFileSync(ICO, icoBuffer);
  await sharp(SRC)
    .resize(256, 256, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(PNG);

  const distAssets = path.join(
    __dirname,
    "../dist-electron/electron/assets",
  );
  if (fs.existsSync(path.join(__dirname, "../dist-electron/electron"))) {
    fs.mkdirSync(distAssets, { recursive: true });
    fs.writeFileSync(path.join(distAssets, "racewolf.ico"), icoBuffer);
    fs.copyFileSync(PNG, path.join(distAssets, "racewolf.png"));
  }

  console.log("[RaceWolf] Icones generees:", ICO);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
