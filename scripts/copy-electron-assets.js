/**
 * Copie les icones Electron vers dist-electron pour le build packagé.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const srcDir = path.join(root, "electron", "assets");
const destDir = path.join(root, "dist-electron", "electron", "assets");

if (!fs.existsSync(srcDir)) {
  console.warn("[copy-electron-assets] Pas de electron/assets — ignore");
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
for (const name of fs.readdirSync(srcDir)) {
  fs.copyFileSync(path.join(srcDir, name), path.join(destDir, name));
}
console.log("[copy-electron-assets] OK →", destDir);
