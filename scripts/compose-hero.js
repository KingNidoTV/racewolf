const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const dir = path.join(__dirname, "../docs/screenshots/hero-parts");
const outPath = path.join(
  __dirname,
  "../docs/screenshots/racewolf-06-hero-visuel.png",
);
const W = 1600;
const H = 900;

function knockDark(data, soft = 32, hard = 16) {
  for (let i = 0; i < data.length; i += 4) {
    const luma =
      0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    if (luma < hard) data[i + 3] = 0;
    else if (luma < soft) {
      data[i + 3] = Math.round(((luma - hard) / (soft - hard)) * 230);
    }
  }
}

async function prepareLogo(size = 72) {
  const { data, info } = await sharp(path.join(dir, "logo.png"))
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  knockDark(data, 22, 12);
  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function floatPanel(file, targetW, { maxH, darkKey = false, radius = 16 } = {}) {
  const meta = await sharp(path.join(dir, file)).metadata();
  let w = targetW;
  let h = Math.round((w / meta.width) * meta.height);
  if (maxH && h > maxH) {
    const s = maxH / h;
    w = Math.round(w * s);
    h = maxH;
  }

  const { data, info } = await sharp(path.join(dir, file))
    .resize(w, h, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (darkKey) knockDark(data, 30, 14);

  const mask = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${info.width}" height="${info.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="${radius}" ry="${radius}" fill="#fff"/>
</svg>`);

  const content = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .composite([
      { input: await sharp(mask).png().toBuffer(), blend: "dest-in" },
    ])
    .png()
    .toBuffer();

  const pad = 10;
  const cardW = info.width + pad * 2;
  const cardH = info.height + pad * 2;
  const outer = 28;
  const fullW = cardW + outer * 2;
  const fullH = cardH + outer * 2;

  const frame = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${fullW}" height="${fullH}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#12141c" stop-opacity="0.78"/>
      <stop offset="100%" stop-color="#07080c" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e9e4ff" stop-opacity="0.55"/>
      <stop offset="50%" stop-color="#9146ff" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#67e8f9" stop-opacity="0.25"/>
    </linearGradient>
    <filter id="sh" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="16" stdDeviation="14" flood-color="#000" flood-opacity="0.55"/>
      <feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="#9146ff" flood-opacity="0.22"/>
    </filter>
  </defs>
  <rect x="${outer}" y="${outer}" width="${cardW}" height="${cardH}" rx="${radius + 4}" ry="${radius + 4}"
        fill="url(#g)" stroke="url(#rim)" stroke-width="1.5" filter="url(#sh)"/>
</svg>`);

  const buffer = await sharp({
    create: {
      width: fullW,
      height: fullH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: await sharp(frame).png().toBuffer(), top: 0, left: 0 },
      { input: content, top: outer + pad, left: outer + pad },
    ])
    .png()
    .toBuffer();

  return { buffer, width: fullW, height: fullH };
}

async function main() {
  // Split-stage: left dark copy, right Ferrari + floating overlays
  const stageLeft = 620;
  const stageW = W - stageLeft;

  const bgRight = await sharp(path.join(dir, "bg.png"))
    .resize(stageW + 80, H, { fit: "cover", position: "centre" })
    .modulate({ brightness: 0.88, saturation: 1.35 })
    .extract({ left: 40, top: 0, width: stageW, height: H })
    .toBuffer();

  const leftBg = await sharp({
    create: {
      width: stageLeft,
      height: H,
      channels: 4,
      background: { r: 7, g: 8, b: 12, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const [logo, track, ath, stand] = await Promise.all([
    prepareLogo(68),
    floatPanel("trackmap.png", 230, { darkKey: true, radius: 18 }),
    floatPanel("ath.png", 250, { darkKey: true, radius: 18 }),
    floatPanel("standings.png", 280, { maxH: 460, radius: 14 }),
  ]);

  const standTop = 110;
  const standLeft = stageLeft + Math.round((stageW - stand.width) / 2);
  const trackTop = 220;
  const trackLeft = stageLeft + 20;
  const athTop = 200;
  const athLeft = W - ath.width - 16;

  const chrome = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#07080c" stop-opacity="1"/>
      <stop offset="58%" stop-color="#07080c" stop-opacity="0.92"/>
      <stop offset="78%" stop-color="#07080c" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#07080c" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ff5a78" stop-opacity="0.14"/>
      <stop offset="35%" stop-color="#07080c" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#07080c" stop-opacity="0.42"/>
    </linearGradient>
    <radialGradient id="warm" cx="78%" cy="22%" r="42%">
      <stop offset="0%" stop-color="#fb923c" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#fb923c" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="violet" cx="55%" cy="55%" r="48%">
      <stop offset="0%" stop-color="#9146ff" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#9146ff" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(145,70,255,0.1)" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- left grid -->
  <rect x="0" y="0" width="${stageLeft + 40}" height="${H}" fill="url(#grid)"/>
  <!-- blend into stage -->
  <rect x="${stageLeft - 80}" y="0" width="220" height="${H}" fill="url(#fade)"/>
  <rect x="${stageLeft}" y="0" width="${stageW}" height="${H}" fill="url(#veil)"/>
  <rect x="${stageLeft}" y="0" width="${stageW}" height="${H}" fill="url(#warm)"/>
  <rect x="${stageLeft}" y="0" width="${stageW}" height="${H}" fill="url(#violet)"/>

  <!-- brand -->
  <text x="108" y="118" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="4" fill="rgba(196,181,253,0.85)">RACEWOLF</text>
  <text x="56" y="210" font-family="Segoe UI, Arial, sans-serif" font-size="58" font-weight="800" fill="#f8f9fc">DONNÉES.</text>
  <text x="56" y="278" font-family="Segoe UI, Arial, sans-serif" font-size="58" font-weight="800" fill="#f8f9fc">VITESSE</text>
  <text x="300" y="278" font-family="Segoe UI, Arial, sans-serif" font-size="58" font-weight="800" fill="#c4b5fd">RÉELLE.</text>

  <text x="56" y="340" font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="rgba(242,244,248,0.72)">
    Overlay télémétrie iRacing. Classement, ATH et trackmap
  </text>
  <text x="56" y="366" font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="rgba(242,244,248,0.72)">
    pour décider plus vite — léger, net, sans latence.
  </text>

  <rect x="56" y="410" rx="999" ry="999" width="210" height="48" fill="#9146ff"/>
  <text x="161" y="440" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="700" fill="#fff">Télécharger</text>

  <text x="290" y="432" font-family="Segoe UI, Arial, sans-serif" font-size="13" fill="rgba(196,181,253,0.9)">✓ Gratuit en Beta</text>
  <text x="290" y="454" font-family="Segoe UI, Arial, sans-serif" font-size="13" fill="rgba(154,163,181,0.95)">✓ Windows 10 / 11</text>

  <text x="56" y="820" font-family="Segoe UI, Arial, sans-serif" font-size="12" letter-spacing="2" fill="rgba(154,163,181,0.7)">OVERLAY IRACING  ·  v0.5.0</text>
</svg>`);

  const canvas = await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: { r: 7, g: 8, b: 12, alpha: 1 },
    },
  })
    .composite([
      { input: leftBg, top: 0, left: 0 },
      { input: bgRight, top: 0, left: stageLeft },
      { input: chrome, top: 0, left: 0 },
      { input: logo, top: 72, left: 52 },
      { input: track.buffer, top: trackTop, left: trackLeft },
      { input: ath.buffer, top: athTop, left: athLeft },
      { input: stand.buffer, top: standTop, left: standLeft },
    ])
    .png()
    .toFile(outPath);

  const webOut = path.join(
    __dirname,
    "../website/assets/screenshots/racewolf-06-hero-visuel.png",
  );
  fs.mkdirSync(path.dirname(webOut), { recursive: true });
  fs.copyFileSync(outPath, webOut);
  console.log("Hero split OK", outPath, canvas);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
