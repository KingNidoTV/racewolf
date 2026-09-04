import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fs from "node:fs/promises";
import { applyAppBranding } from "./appIcon";
import { createEnduranceWindow } from "./enduranceWindow";
import { createLauncherWindow } from "./launcherWindow";
import { createOverlayWindow } from "./overlayWindow";
import {
  loadEndurancePlan,
  saveEndurancePlan,
} from "./storage/endurancePlanStorage";
import { createDefaultPlan } from "../src/endurance/models";
import { DEFAULT_LIVE_RACE_SNAPSHOT } from "../src/endurance/live/models";
import { EnduranceStintAlertService } from "./endurance/EnduranceStintAlertService";
import type { EnduranceTelemetryBridge } from "./endurance/EnduranceTelemetryBridge";
import type { CollaborationServer } from "./collaboration/CollaborationServer";
import { LocalCollabRelay } from "./collaboration/LocalCollabRelay";
import { TelemetryController } from "./telemetry/TelemetryController";
import {
  loadOverlayPrefs,
  saveOverlayPrefs,
} from "./storage/overlayPrefsStorage";
import type { DemoOverlayPreset, LauncherStartMode, LauncherWindowMode } from "../src/types/ipc";
import {
  RADIO_HOTKEY_OPTIONS,
  type OverlayPanelPrefs,
  type RadioHotkeyId,
} from "../src/types/overlayPrefs";
import type { EnduranceLiveSession } from "../src/endurance/models/LiveSession";
import type { LiveRaceSnapshot } from "../src/endurance/live/models";
import type { EndurancePlan } from "../src/endurance/models";
import type { CollaborationUser } from "../src/endurance/collaboration/types";
import {
  syncRadioHotkeys,
  unregisterRadioHotkeys,
} from "./radioHotkeys";
import { wheelInput } from "./wheelInput";
import {
  DEFAULT_BOX_CALL,
  type BoxCallState,
} from "../src/endurance/collaboration/types";
import { loadBetaUser, saveBetaUser } from "./storage/betaUserStorage";
import { submitBetaRegistration } from "./beta/submitBetaRegistration";
import type { BetaRegisterInput } from "../src/types/betaUser";

applyAppBranding();

const isDev = !app.isPackaged && process.env.ATH_DEV === "1";
const enduranceOnlyMode = process.env.ATH_MODE?.toLowerCase() === "endurance";

let launcherWindow: BrowserWindow | null = null;
let enduranceWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let telemetry: TelemetryController | null = null;
let enduranceTelemetry: EnduranceTelemetryBridge | null = null;
let enduranceTelemetryLoading: Promise<EnduranceTelemetryBridge> | null = null;
let enduranceLiveSnapshot: EnduranceLiveSession | null = null;
let enduranceLiveRaceSnapshot: LiveRaceSnapshot | null = null;
let endurancePlan: EndurancePlan | null = null;
const enduranceStintAlerts = new EnduranceStintAlertService();
let collaborationServer: CollaborationServer | null = null;
const localCollabRelay = new LocalCollabRelay();
let boxCallState: BoxCallState = { ...DEFAULT_BOX_CALL };
let pendingStartupMode: LauncherStartMode | null = null;
let autoStartDone = false;

function getOverlay(): BrowserWindow | null {
  if (overlayWindow?.isDestroyed()) overlayWindow = null;
  return overlayWindow;
}

function ensureOverlay(): BrowserWindow {
  let win = getOverlay();
  if (!win) {
    win = createOverlayWindow(isDev);
    overlayWindow = win;
    win.on("closed", () => {
      overlayWindow = null;
    });
  }
  return win;
}

async function runPendingAutoStart(): Promise<void> {
  if (autoStartDone || !pendingStartupMode || !telemetry) return;
  autoStartDone = true;
  const mode = pendingStartupMode;
  pendingStartupMode = null;
  ensureOverlay();
  clearBoxCallState();
  await telemetry.start(mode);
  scheduleRadioHotkeys(telemetry.getPanelPrefs());
}

function broadcastStatus(): void {
  if (!telemetry || !launcherWindow || launcherWindow.isDestroyed()) return;
  void telemetry.getStatus().then((status) => {
    launcherWindow?.webContents.send("ath:launcher-status", status);
  });
}

function getEndurance(): BrowserWindow | null {
  if (enduranceWindow?.isDestroyed()) enduranceWindow = null;
  return enduranceWindow;
}

function openEnduranceWindow(): BrowserWindow {
  let win = getEndurance();
  if (!win) {
    win = createEnduranceWindow(isDev);
    enduranceWindow = win;
    win.on("closed", () => {
      enduranceWindow = null;
      if (enduranceOnlyMode) {
        void telemetry?.stop();
        app.quit();
      }
    });
  }
  void ensureEnduranceTelemetry();
  if (!win.isVisible()) win.show();
  win.focus();
  const pushSnapshots = () => {
    if (enduranceLiveSnapshot) {
      win.webContents.send("ath:endurance-live", enduranceLiveSnapshot);
    } else if (enduranceTelemetry) {
      broadcastEnduranceLive(enduranceTelemetry.getSnapshot());
    }
    if (enduranceLiveRaceSnapshot) {
      win.webContents.send("ath:endurance-live-race", enduranceLiveRaceSnapshot);
    } else if (enduranceTelemetry) {
      broadcastEnduranceLiveRace(enduranceTelemetry.getLiveRaceSnapshot());
    }
  };
  if (win.webContents.isLoading()) {
    win.webContents.once("did-finish-load", pushSnapshots);
  } else {
    pushSnapshots();
  }
  return win;
}

function broadcastEnduranceLive(snapshot: EnduranceLiveSession): void {
  enduranceLiveSnapshot = snapshot;
  const win = getEndurance();
  if (win && !win.isDestroyed()) {
    win.webContents.send("ath:endurance-live", snapshot);
  }
}

function broadcastEnduranceLiveRace(snapshot: LiveRaceSnapshot): void {
  enduranceLiveRaceSnapshot = snapshot;
  const alert = enduranceStintAlerts.tick(snapshot);
  if (alert) sendRadioMessage(alert, "box", "Stratégie");
  const win = getEndurance();
  if (win && !win.isDestroyed()) {
    win.webContents.send("ath:endurance-live-race", snapshot);
  }
}

function broadcastBoxCall(state: BoxCallState): void {
  boxCallState = state;
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send("ath:box-call", state);
      // compat écouteurs collab existants
      win.webContents.send("ath:endurance-collab-box-call", state);
    }
  }
}

function setBoxCallActive(
  active: boolean,
  byUserId = "local",
  byName = "Équipe",
  message: string | null = null,
  preset: import("../src/endurance/collaboration/types").RadioPresetId | null = null,
): BoxCallState {
  const at = new Date().toISOString();
  const next: BoxCallState = active
    ? {
        active: true,
        byUserId,
        byName,
        at,
        message: message?.trim() || null,
        preset,
      }
    : { ...DEFAULT_BOX_CALL, at };
  broadcastBoxCall(next);
  return next;
}

function sendRadioMessage(
  message: string,
  preset: import("../src/endurance/collaboration/types").RadioPresetId,
  byName = "Équipe",
): BoxCallState {
  if (collaborationServer?.isRunning()) {
    const state = collaborationServer.pushBoxCall(true, message, preset);
    broadcastBoxCall(state);
    return state;
  }
  return setBoxCallActive(true, "local", byName, message, preset);
}

function broadcastCollabUsers(users: CollaborationUser[]): void {
  const win = getEndurance();
  if (win && !win.isDestroyed()) {
    win.webContents.send("ath:endurance-collab-users", users);
  }
  if (launcherWindow && !launcherWindow.isDestroyed() && launcherWindow !== win) {
    launcherWindow.webContents.send("ath:endurance-collab-users", users);
  }
}

function broadcastCollabPlan(plan: EndurancePlan, revision: number): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send("ath:endurance-collab-plan", plan, revision);
    }
  }
}

/** Notifie toutes les fenêtres (overlay inclus) qu'un plan a été sauvegardé. */
function broadcastEndurancePlanUpdated(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send("ath:endurance-plan-updated");
    }
  }
}

function applyRadioHotkeys(prefs: OverlayPanelPrefs): void {
  const onTrigger = (_id: RadioHotkeyId, message: string) => {
    sendRadioMessage(message, "custom", "Pilote");
  };
  syncRadioHotkeys(prefs, onTrigger);
  wheelInput.setRadioHandler(onTrigger);
  wheelInput.syncRuntime(prefs);
}

let radioHotkeysTimer: ReturnType<typeof setTimeout> | null = null;

/** Active les raccourcis après un délai pour éviter un faux déclenchement au lancement. */
function scheduleRadioHotkeys(prefs: OverlayPanelPrefs): void {
  if (radioHotkeysTimer) {
    clearTimeout(radioHotkeysTimer);
    radioHotkeysTimer = null;
  }
  suspendRadioHotkeys();
  radioHotkeysTimer = setTimeout(() => {
    radioHotkeysTimer = null;
    applyRadioHotkeys(prefs);
  }, 1200);
}

function suspendRadioHotkeys(): void {
  if (radioHotkeysTimer) {
    clearTimeout(radioHotkeysTimer);
    radioHotkeysTimer = null;
  }
  unregisterRadioHotkeys();
  wheelInput.setRadioHandler(null);
  wheelInput.syncRuntime(null);
  wheelInput.cancelListen();
}

function clearBoxCallState(): void {
  broadcastBoxCall({ ...DEFAULT_BOX_CALL });
}

function ensureEnduranceTelemetry(): Promise<EnduranceTelemetryBridge> {
  if (enduranceTelemetry) return Promise.resolve(enduranceTelemetry);
  if (!enduranceTelemetryLoading) {
    enduranceTelemetryLoading = import("./endurance/EnduranceTelemetryBridge").then(
      ({ EnduranceTelemetryBridge }) => {
        const bridge = new EnduranceTelemetryBridge();
        enduranceTelemetry = bridge;
        void bridge.start(
          (snapshot) => broadcastEnduranceLive(snapshot),
          (liveRace) => broadcastEnduranceLiveRace(liveRace),
        );
        return bridge;
      },
    );
  }
  return enduranceTelemetryLoading;
}

function registerIpc(): void {
  ipcMain.handle("ath:endurance-load", async () => {
    endurancePlan = (await loadEndurancePlan()) ?? createDefaultPlan();
    enduranceStintAlerts.setPlan(endurancePlan);
    return endurancePlan;
  });

  ipcMain.handle("ath:endurance-save", async (_e, plan: EndurancePlan) => {
    await saveEndurancePlan(plan);
    endurancePlan = plan;
    enduranceStintAlerts.setPlan(plan);
    broadcastEndurancePlanUpdated();
  });

  ipcMain.handle("ath:endurance-open", async () => {
    openEnduranceWindow();
  });

  ipcMain.handle("ath:endurance-live-get", async () => {
    return enduranceLiveSnapshot ?? enduranceTelemetry?.getSnapshot() ?? null;
  });

  ipcMain.handle("ath:endurance-live-race-get", async () => {
    return (
      enduranceLiveRaceSnapshot ??
      enduranceTelemetry?.getLiveRaceSnapshot() ??
      DEFAULT_LIVE_RACE_SNAPSHOT
    );
  });

  ipcMain.handle(
    "ath:endurance-export-pdf",
    async (_e, html: string, defaultName: string) => {
      const parentWin = getEndurance();
      const saveOpts = {
        defaultPath: defaultName,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      };
      const { canceled, filePath } =
        parentWin && !parentWin.isDestroyed()
          ? await dialog.showSaveDialog(parentWin, saveOpts)
          : await dialog.showSaveDialog(saveOpts);
      if (canceled || !filePath) {
        return { saved: false as const };
      }

      const pdfWin = new BrowserWindow({
        show: false,
        webPreferences: { sandbox: true },
      });
      try {
        await pdfWin.loadURL(
          `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
        );
        const buf = await pdfWin.webContents.printToPDF({
          printBackground: true,
        });
        await fs.writeFile(filePath, buf);
        return { saved: true as const, filePath };
      } finally {
        if (!pdfWin.isDestroyed()) {
          pdfWin.destroy();
        }
      }
    },
  );

  ipcMain.handle(
    "ath:endurance-collab-start-host",
    async (_e, plan: EndurancePlan) => {
      if (!collaborationServer) {
        const { CollaborationServer } = await import(
          "./collaboration/CollaborationServer"
        );
        collaborationServer = new CollaborationServer();
      }
      const info = collaborationServer.start(
        plan,
        (remotePlan, revision) => {
          broadcastCollabPlan(remotePlan, revision);
        },
        (users) => {
          broadcastCollabUsers(users);
        },
        (boxCall) => {
          broadcastBoxCall(boxCall);
        },
      );
      broadcastCollabUsers(collaborationServer.getUsers());
      return info;
    },
  );

  ipcMain.handle(
    "ath:endurance-collab-push-plan",
    async (_e, plan: EndurancePlan, revision: number) => {
      collaborationServer?.pushPlan(plan, revision);
    },
  );

  ipcMain.handle(
    "ath:endurance-collab-push-box-call",
    async (
      _e,
      active: boolean,
      message: string | null = null,
      preset: import("../src/endurance/collaboration/types").RadioPresetId | null = null,
    ) => {
      if (collaborationServer?.isRunning()) {
        const state = collaborationServer.pushBoxCall(active, message, preset);
        broadcastBoxCall(state);
        return state;
      }
      return setBoxCallActive(active, "host", "Hôte", message, preset);
    },
  );

  ipcMain.handle("ath:box-call-get", async () => boxCallState);

  ipcMain.handle(
    "ath:box-call-set",
    async (
      _e,
      payload: {
        active: boolean;
        message?: string | null;
        preset?: import("../src/endurance/collaboration/types").RadioPresetId | null;
        byName?: string | null;
      },
    ) => {
      const message = payload.message ?? null;
      const preset = payload.preset ?? null;
      const byName = payload.byName?.trim() || "Équipe";
      if (collaborationServer?.isRunning()) {
        const state = collaborationServer.pushBoxCall(
          payload.active,
          message,
          preset,
        );
        // Conserver l'auteur (pilote vs équipe) côté overlay
        const stamped = {
          ...state,
          byName: payload.active ? byName : state.byName,
          byUserId: payload.active
            ? byName.toLowerCase() === "pilote"
              ? "driver"
              : state.byUserId
            : state.byUserId,
        };
        broadcastBoxCall(stamped);
        return stamped;
      }
      return setBoxCallActive(
        payload.active,
        byName.toLowerCase() === "pilote" ? "driver" : "local",
        byName,
        message,
        preset,
      );
    },
  );

  ipcMain.handle("ath:box-call-toggle", async () => {
    const nextActive = !boxCallState.active;
    const message = nextActive
      ? (boxCallState.message ?? "Box in this lap")
      : null;
    const preset = nextActive ? (boxCallState.preset ?? "box") : null;
    if (collaborationServer?.isRunning()) {
      const state = collaborationServer.pushBoxCall(nextActive, message, preset);
      broadcastBoxCall(state);
      return state;
    }
    return setBoxCallActive(nextActive, "local", "Équipe", message, preset);
  });

  ipcMain.handle(
    "ath:box-call-apply",
    async (_e, state: BoxCallState) => {
      broadcastBoxCall(state);
      return state;
    },
  );

  ipcMain.handle("ath:endurance-collab-stop-host", async () => {
    collaborationServer?.stop();
    collaborationServer = null;
    broadcastCollabUsers([]);
    broadcastBoxCall({ ...DEFAULT_BOX_CALL });
  });

  ipcMain.handle("ath:endurance-collab-ensure-local-relay", async () => {
    return localCollabRelay.ensureRunning();
  });

  ipcMain.handle(
    "ath:launcher-start",
    async (_e, mode: LauncherStartMode, demoPreset?: DemoOverlayPreset) => {
      autoStartDone = true;
      pendingStartupMode = null;
      ensureOverlay();
      if (!telemetry) return;
      clearBoxCallState();
      await telemetry.start(mode, demoPreset);
      scheduleRadioHotkeys(telemetry.getPanelPrefs());
    },
  );

  ipcMain.handle(
    "ath:launcher-demo-preset",
    async (_e, preset: DemoOverlayPreset) => {
      ensureOverlay();
      if (!telemetry) return;
      await telemetry.setDemoPreset(preset);
    },
  );

  ipcMain.handle("ath:launcher-stop", async () => {
    suspendRadioHotkeys();
    clearBoxCallState();
    await telemetry?.stop();
  });

  ipcMain.handle("ath:launcher-get-status", async () => {
    return telemetry?.getStatus() ?? {
      overlayActive: false,
      iracingRunning: false,
      connected: false,
      source: null,
      viewMode: null,
      demoPreset: null,
      error: null,
    };
  });

  ipcMain.handle("ath:beta-user-get", async () => loadBetaUser());

  ipcMain.handle(
    "ath:beta-user-register",
    async (_e, input: BetaRegisterInput) => {
      const profile = await saveBetaUser(input, app.getVersion());
      const remote = await submitBetaRegistration(profile);
      return {
        profile,
        remoteSynced: remote.ok,
        remoteError: remote.error,
      };
    },
  );

  ipcMain.handle(
    "ath:launcher-set-window-mode",
    async (_e, mode: LauncherWindowMode) => {
      applyLauncherWindowMode(mode);
    },
  );

  ipcMain.handle("ath:radio-hotkeys-suspend", async () => {
    suspendRadioHotkeys();
  });

  ipcMain.handle(
    "ath:radio-hotkey-trigger",
    async (_event, id: RadioHotkeyId) => {
      const option = RADIO_HOTKEY_OPTIONS.find((item) => item.id === id);
      if (!option) return;
      sendRadioMessage(option.message, "custom", "Pilote");
    },
  );

  ipcMain.handle("ath:radio-hotkeys-resume", async () => {
    const status = telemetry ? await telemetry.getStatus() : null;
    if (!status?.overlayActive) return;
    const prefs =
      telemetry?.getPanelPrefs() ?? (await loadOverlayPrefs());
    scheduleRadioHotkeys(prefs);
  });

  ipcMain.handle("ath:wheel-input-status", async () => wheelInput.getStatus());

  ipcMain.handle("ath:wheel-input-listen", async () => {
    suspendRadioHotkeys();
    try {
      return await wheelInput.listenForNextInput();
    } catch (err) {
      if (err instanceof Error && err.message === "cancelled") {
        return null;
      }
      throw err;
    }
  });

  ipcMain.handle("ath:wheel-input-cancel-listen", async () => {
    wheelInput.cancelListen();
  });

  ipcMain.handle("ath:overlay-prefs-get", async () => {
    return telemetry?.getPanelPrefs() ?? (await loadOverlayPrefs());
  });

  ipcMain.handle(
    "ath:overlay-prefs-set",
    async (_e, prefs: OverlayPanelPrefs) => {
      const saved = await saveOverlayPrefs(prefs);
      telemetry?.setPanelPrefs(saved);
      const status = telemetry ? await telemetry.getStatus() : null;
      if (status?.overlayActive) {
        scheduleRadioHotkeys(saved);
      }
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
          win.webContents.send("ath:overlay-prefs", saved);
        }
      }
      return saved;
    },
  );

  ipcMain.handle("ath:overlay-ready", async () => {
    await runPendingAutoStart();
    telemetry?.resendLast();
    return telemetry?.getLastEnvelope() ?? null;
  });

  ipcMain.handle("ath:overlay-get-snapshot", async () => {
    return telemetry?.getLastEnvelope() ?? null;
  });

  ipcMain.on("ath:overlay-pointer", (event, ignore: boolean) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;
    win.setIgnoreMouseEvents(Boolean(ignore), { forward: true });
  });
}

function applyLauncherWindowMode(mode: LauncherWindowMode): void {
  const win = launcherWindow;
  if (!win || win.isDestroyed()) return;

  if (mode === "home") {
    win.setResizable(false);
    win.setMinimumSize(400, 520);
    win.setSize(420, 580, true);
  } else if (mode === "preview") {
    win.setResizable(true);
    win.setMinimumSize(960, 700);
    win.setSize(1180, 820, true);
  } else {
    win.setResizable(true);
    win.setMinimumSize(960, 640);
    win.setSize(1180, 820, true);
  }
  win.center();
}

app.whenReady().then(async () => {
  registerIpc();

  if (!enduranceOnlyMode) {
    launcherWindow = createLauncherWindow(isDev);
    launcherWindow.setAlwaysOnTop(true, "floating", 2);

    launcherWindow.on("closed", () => {
      launcherWindow = null;
      void telemetry?.stop();
      app.quit();
    });
  }

  telemetry = new TelemetryController(getOverlay, broadcastStatus);
  clearBoxCallState();
  suspendRadioHotkeys();

  void (async () => {
    const [prefs, plan] = await Promise.all([
      loadOverlayPrefs(),
      loadEndurancePlan(),
    ]);
    endurancePlan = plan ?? createDefaultPlan();
    enduranceStintAlerts.setPlan(endurancePlan);
    telemetry?.setPanelPrefs(prefs);
  })();

  if (enduranceOnlyMode) {
    await ensureEnduranceTelemetry();
    const win = openEnduranceWindow();
    win.once("ready-to-show", () => {
      win.show();
      win.focus();
    });
    return;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  unregisterRadioHotkeys();
  wheelInput.stop();
  telemetry?.stop();
  enduranceTelemetry?.stop();
  collaborationServer?.stop();
  localCollabRelay.stop();
});
