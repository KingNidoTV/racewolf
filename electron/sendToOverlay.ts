import type { BrowserWindow } from "electron";
import type { TelemetryEnvelope } from "../src/types/ipc";

export function sendToOverlay(
  win: BrowserWindow,
  channel: "ath:telemetry",
  payload: TelemetryEnvelope,
): void {
  if (win.isDestroyed()) return;

  const deliver = () => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  };

  if (win.webContents.isLoading()) {
    win.webContents.once("did-finish-load", deliver);
  } else {
    deliver();
  }
}
