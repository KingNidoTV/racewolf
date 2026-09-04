/**
 * Retire le fond noir du logo RaceWolf (noir connecté aux bords uniquement).
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const LOGO = path.join(__dirname, "../public/assets/racewolf-logo.png");
const DARK = 52;

function isDark(r, g, b) {
  return r <= DARK && g <= DARK && b <= DARK;
}

async function main() {
  const { data, info } = await sharp(LOGO)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const pixels = data;
  const visited = new Uint8Array(width * height);
  const queue = [];

  const pushIfDark = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    const p = idx * 4;
    if (!isDark(pixels[p], pixels[p + 1], pixels[p + 2])) return;
    visited[idx] = 1;
    queue.push(idx);
  };

  for (let x = 0; x < width; x++) {
    pushIfDark(x, 0);
    pushIfDark(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    pushIfDark(0, y);
    pushIfDark(width - 1, y);
  }

  while (queue.length > 0) {
    const idx = queue.pop();
    const x = idx % width;
    const y = (idx - x) / width;
    const p = idx * 4;
    pixels[p + 3] = 0;

    pushIfDark(x - 1, y);
    pushIfDark(x + 1, y);
    pushIfDark(x, y - 1);
    pushIfDark(x, y + 1);
  }

  const tmp = `${LOGO}.tmp.png`;
  await sharp(pixels, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toFile(tmp);

  fs.renameSync(tmp, LOGO);
  console.log("[RaceWolf] Logo sans fond:", LOGO);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
