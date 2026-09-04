import { BrowserWindow, screen } from "electron";
import path from "path";
import { getAppIcon } from "./appIcon";
import { distFile } from "./paths";

const DEV_URL = "http://localhost:5173";

export function createOverlayWindow(isDev: boolean): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().bounds;

  const win = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    icon: getAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // Le polling Gamepad doit continuer quand iRacing possède le focus.
      backgroundThrottling: false,
    },
  });

  win.setIgnoreMouseEvents(true, { forward: true });
  win.setTitle("RaceWolf Overlay");

  if (isDev) {
    void win.loadURL(`${DEV_URL}/?mode=auto`);
  } else {
    void win.loadFile(distFile("index.html"), {
      query: { mode: "auto" },
    });
  }

  return win;
}
