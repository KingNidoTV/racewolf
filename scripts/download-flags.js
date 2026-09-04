/**
 * Télécharge les drapeaux ISO (et nations UK) dans public/assets/flags
 * pour que le portable marche sans Internet.
 *
 * Usage: node scripts/download-flags.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "assets", "flags");
const flairsPath = path.join(root, "src", "data", "iracing-flairs.json");

const ALIAS = {
  ENG: "gb-eng",
  SCT: "gb-sct",
  NIR: "gb-nir",
  WLS: "gb-wls",
  GO: "un",
  UN: "un",
  IR: "un",
};

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchBuffer(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`${url} → ${res.statusCode}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

async function downloadOne(code) {
  const dest = path.join(outDir, `${code}.svg`);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 40) return "skip";
  const buf = await fetchBuffer(`https://flagcdn.com/${code}.svg`);
  fs.writeFileSync(dest, buf);
  return "ok";
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const flairs = JSON.parse(fs.readFileSync(flairsPath, "utf8")).flairs;
  const codes = new Set(["un", "gb-eng", "gb-sct", "gb-nir", "gb-wls"]);

  for (const row of flairs) {
    const raw = String(row.country_code || "")
      .trim()
      .toUpperCase();
    if (!raw) continue;
    if (ALIAS[raw]) {
      codes.add(ALIAS[raw]);
      continue;
    }
    if (/^[A-Z]{2}$/.test(raw)) codes.add(raw.toLowerCase());
  }

  let ok = 0;
  let skip = 0;
  let fail = 0;
  for (const code of [...codes].sort()) {
    try {
      const result = await downloadOne(code);
      if (result === "skip") skip += 1;
      else ok += 1;
      process.stdout.write(`.`);
    } catch (err) {
      fail += 1;
      console.warn(`\n[flags] fail ${code}: ${err.message}`);
    }
  }
  console.log(`\n[flags] ok=${ok} skip=${skip} fail=${fail} → ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
