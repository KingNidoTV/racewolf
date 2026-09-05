const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const website = path.join(root, "website");
const assets = path.join(website, "assets");
const shotsDir = path.join(assets, "screenshots");
const downloads = path.join(website, "downloads");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = pkg.version;
const fileName = `RaceWolf-${version}-portable.exe`;
const exeSrc = path.join(root, "release", fileName);

function copy(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

fs.mkdirSync(shotsDir, { recursive: true });
fs.mkdirSync(downloads, { recursive: true });

copy(path.join(root, "public", "assets", "racewolf-logo.png"), path.join(assets, "logo.png"));
copy(path.join(root, "electron", "assets", "racewolf.png"), path.join(assets, "favicon.png"));

const shots = [
  "overlay-garage.png",
  "overlay-course.png",
  "racewolf-04-pitcrew-preparation.png",
  "racewolf-05-pitcrew-strategie.png",
  "racewolf-06-hero-visuel.png",
];
for (const name of shots) {
  const src = path.join(root, "docs", "screenshots", name);
  if (fs.existsSync(src)) {
    copy(src, path.join(shotsDir, name));
  }
}

let sizeLabel = "";
if (fs.existsSync(exeSrc)) {
  const mb = fs.statSync(exeSrc).size / (1024 * 1024);
  sizeLabel = `${mb.toFixed(0)} Mo`;
  if (process.env.RACEWOLF_COPY_EXE === "1") {
    copy(exeSrc, path.join(downloads, fileName));
    console.log(`Copied ${fileName} (${sizeLabel})`);
  } else {
    console.log(
      `${fileName} found (${sizeLabel}). Place it in website/downloads/ to enable local download.`,
    );
  }
} else {
  console.warn(`Missing ${exeSrc} — run npm run dist first.`);
}

let feedbackEmail = "beta@racewolf.app";
let downloadUrl = `./downloads/${fileName}`;
const configPath = path.join(website, "config.js");
if (fs.existsSync(configPath)) {
  const existing = fs.readFileSync(configPath, "utf8");
  const emailMatch = existing.match(/feedbackEmail:\s*([^,\n]+)/);
  if (emailMatch) {
    try {
      feedbackEmail = JSON.parse(emailMatch[1].trim());
    } catch {
      /* keep default */
    }
  }
  const urlMatch = existing.match(/downloadUrl:\s*([^,\n]+)/);
  if (urlMatch) {
    try {
      const previous = JSON.parse(urlMatch[1].trim());
      // Keep Release / CDN URLs; bump version/filename when package version changes.
      if (/^https?:\/\//i.test(previous)) {
        downloadUrl = previous
          .replace(/\/download\/v[\d.]+\//, `/download/v${version}/`)
          .replace(/RaceWolf-[\d.]+-portable\.exe/g, fileName);
      }
    } catch {
      /* keep default */
    }
  }
}
if (process.env.RACEWOLF_DOWNLOAD_URL) {
  downloadUrl = process.env.RACEWOLF_DOWNLOAD_URL.trim();
}

const config = `window.RACEWOLF = {
  version: ${JSON.stringify(version)},
  fileName: ${JSON.stringify(fileName)},
  downloadUrl: ${JSON.stringify(downloadUrl)},
  sizeLabel: ${JSON.stringify(sizeLabel || "~83 Mo")},
  platform: "Windows 10/11 · 64 bits",
  feedbackEmail: ${JSON.stringify(feedbackEmail)},
};
`
fs.writeFileSync(configPath, config);
fs.writeFileSync(path.join(website, ".nojekyll"), "");
fs.writeFileSync(
  path.join(downloads, ".gitkeep"),
  "# Place RaceWolf-*-portable.exe here (copied by npm run website:prepare)\n",
);

console.log(`Website ready in ${website}`);
