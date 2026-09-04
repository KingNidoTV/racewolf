/**
 * Cree RaceWolf.lnk a la racine (icone app → scripts/launch.vbs).
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const vbs = path.join(__dirname, "launch.vbs");
const lnk = path.join(root, "RaceWolf.lnk");
const ico = path.join(root, "electron", "assets", "racewolf.ico");

if (!fs.existsSync(vbs)) {
  console.warn("[shortcut] scripts/launch.vbs manquant — ignore");
  process.exit(0);
}

const esc = (p) => p.replace(/'/g, "''");
const iconLocation = fs.existsSync(ico) ? esc(ico) : esc(vbs);

const ps = `
$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut('${esc(lnk)}')
$s.TargetPath = '${esc(vbs)}'
$s.WorkingDirectory = '${esc(root)}'
$s.WindowStyle = 7
$s.Description = 'RaceWolf'
$s.IconLocation = '${iconLocation}'
$s.Save()
`;

try {
  execFileSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
    { stdio: "ignore" },
  );
  console.log("[shortcut] RaceWolf.lnk OK");
} catch {
  console.warn("[shortcut] Impossible de creer RaceWolf.lnk");
}
