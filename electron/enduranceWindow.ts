import { BrowserWindow } from "electron";
import path from "path";
import { getAppIcon } from "./appIcon";
import { distFile } from "./paths";

const DEV_URL = "http://localhost:5173";

export function createEnduranceWindow(isDev: boolean): BrowserWindow {
  const win = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: "RaceWolf — Pit Crew",
    icon: getAppIcon(),
    backgroundColor: "#0f1419",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    void win.loadURL(`${DEV_URL}/endurance.html`);
  } else {
    void win.loadFile(distFile("endurance.html"));
  }

  return win;
}
