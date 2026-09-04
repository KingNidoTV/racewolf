import path from "path";
import { app } from "electron";

/** Chemin vers l'UI Vite (`dist/`) — OK en dev et packagé (asar). */
export function distFile(...segments: string[]): string {
  if (app.isPackaged) {
    return path.join(app.getAppPath(), "dist", ...segments);
  }
  return path.join(__dirname, "..", "..", "dist", ...segments);
}
