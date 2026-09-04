/**
 * Télécharge et extrait le binaire Electron si path.txt / electron.exe sont absents.
 * Contourne les échecs silencieux de extract-zip sur certains Windows.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.join(__dirname, "..");
const electronDir = path.join(projectRoot, "node_modules", "electron");
const pathFile = path.join(electronDir, "path.txt");
const installScript = path.join(electronDir, "install.js");
const distDir = path.join(electronDir, "dist");

function electronReady() {
  if (!fs.existsSync(pathFile)) return false;
  try {
    const rel = fs.readFileSync(pathFile, "utf-8").trim();
    const exe = path.join(distDir, rel);
    return fs.existsSync(exe);
  } catch {
    return false;
  }
}

function runNodeInstall() {
  const env = { ...process.env };
  delete env.ELECTRON_SKIP_BINARY_DOWNLOAD;
  return spawnSync(process.execPath, [installScript], {
    cwd: electronDir,
    stdio: "inherit",
    env,
  });
}

function extractZipWithTar(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const result = spawnSync("tar", ["-xf", zipPath, "-C", destDir], {
    stdio: "inherit",
    shell: false,
  });
  return result.status === 0;
}

async function downloadAndExtractTar() {
  const { downloadArtifact } = require(path.join(
    electronDir,
    "node_modules",
    "@electron",
    "get",
  ));
  const { version } = require(path.join(electronDir, "package.json"));
  const arch = process.env.npm_config_arch || process.arch;
  const platform = process.env.npm_config_platform || process.platform;

  console.log(
    `[ATH] Telechargement Electron ${version} (${platform}-${arch})...`,
  );

  const zipPath = await downloadArtifact({
    version,
    artifactName: "electron",
    platform,
    arch,
    force: true,
  });

  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }

  if (!extractZipWithTar(zipPath, distDir)) {
    throw new Error("Extraction tar echouee pour " + zipPath);
  }

  const platformPath =
    platform === "win32" ? "electron.exe" : "electron";

  if (!fs.existsSync(path.join(distDir, platformPath))) {
    throw new Error("Binaire introuvable apres extraction: " + platformPath);
  }

  fs.writeFileSync(pathFile, platformPath);
}

async function ensureElectron() {
  if (!fs.existsSync(installScript)) {
    console.error("[ATH] Paquet electron absent. Lancez: npm install");
    process.exit(1);
  }

  if (electronReady()) {
    console.log("[ATH] Electron deja installe.");
    return;
  }

  console.log("[ATH] Installation du binaire Electron (~120 Mo)...");
  const first = runNodeInstall();
  if (electronReady()) return;

  if (first.status !== 0) {
    console.warn("[ATH] install.js a echoue, tentative via tar...");
  } else {
    console.warn("[ATH] install.js incomplet, extraction de secours via tar...");
  }

  try {
    await downloadAndExtractTar();
  } catch (err) {
    console.error("[ATH] Echec:", err instanceof Error ? err.message : err);
    console.error("[ATH] Verifiez internet / proxy, puis: npm run install:electron");
    process.exit(1);
  }

  if (!electronReady()) {
    console.error("[ATH] Electron toujours absent apres installation.");
    process.exit(1);
  }

  console.log("[ATH] Electron installe avec succes.");
}

ensureElectron().catch((err) => {
  console.error(err);
  process.exit(1);
});
