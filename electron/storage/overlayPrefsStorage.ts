import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_OVERLAY_PREFS,
  normalizeOverlayPrefs,
  type OverlayPanelPrefs,
} from "../../src/types/overlayPrefs";

function prefsPath(): string {
  return path.join(app.getPath("userData"), "overlay-prefs.json");
}

export async function loadOverlayPrefs(): Promise<OverlayPanelPrefs> {
  try {
    const raw = await fs.readFile(prefsPath(), "utf8");
    return normalizeOverlayPrefs(JSON.parse(raw) as Partial<OverlayPanelPrefs>);
  } catch {
    return { ...DEFAULT_OVERLAY_PREFS };
  }
}

export async function saveOverlayPrefs(
  prefs: OverlayPanelPrefs,
): Promise<OverlayPanelPrefs> {
  const next = normalizeOverlayPrefs(prefs);
  await fs.writeFile(prefsPath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}
