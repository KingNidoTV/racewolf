import { BrowserWindow } from "electron";
import path from "path";
import { getAppIcon } from "./appIcon";
import { distFile } from "./paths";

const DEV_URL = "http://localhost:5173";

export function createLauncherWindow(isDev: boolean): BrowserWindow {
  const win = new BrowserWindow({
    width: 420,
    height: 580,
    minWidth: 400,
    minHeight: 520,
    show: true,
    paintWhenInitiallyHidden: true,
    resizable: false,
    maximizable: true,
    fullscreenable: false,
    autoHideMenuBar: true,
    title: "RaceWolf — Launcher",
    icon: getAppIcon(),
    backgroundColor: "#0a0e14",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: true,
    },
  });

  if (isDev) {
    void win.loadURL(`${DEV_URL}/launcher.html`);
    win.webContents.on("did-fail-load", (_ev, code, desc, url) => {
      console.error("[RaceWolf launcher] did-fail-load", code, desc, url);
    });
  } else {
    void win.loadFile(distFile("launcher.html"));
  }

  win.show();
  win.focus();

  return win;
}
