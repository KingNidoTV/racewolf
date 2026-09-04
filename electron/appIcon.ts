import { app, nativeImage } from "electron";
import fs from "fs";
import path from "path";

const APP_USER_MODEL_ID = "com.racewolf.launcher";

function iconCandidates(): string[] {
  const projectRoot = path.join(__dirname, "..", "..");
  return [
    path.join(__dirname, "assets", "racewolf.ico"),
    path.join(projectRoot, "electron", "assets", "racewolf.ico"),
    path.join(__dirname, "assets", "racewolf.png"),
    path.join(projectRoot, "electron", "assets", "racewolf.png"),
    path.join(projectRoot, "public", "assets", "racewolf-logo.png"),
  ];
}

export function resolveAppIconPath(): string | undefined {
  for (const candidate of iconCandidates()) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

export function getAppIcon() {
  const iconPath = resolveAppIconPath();
  if (!iconPath) return undefined;
  const image = nativeImage.createFromPath(iconPath);
  return image.isEmpty() ? undefined : image;
}

/** Barre des taches Windows + icone fenetre (hors overlay sans cadre). */
export function applyAppBranding(): void {
  if (process.platform === "win32") {
    app.setAppUserModelId(APP_USER_MODEL_ID);
  }

  const icon = getAppIcon();
  if (!icon) return;

  if (process.platform === "darwin" && app.dock) {
    app.dock.setIcon(icon);
  }
}
