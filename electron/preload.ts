import { contextBridge, ipcRenderer } from "electron";
import type { EndurancePlan } from "../src/endurance/models";
import type { CollaborationHostInfo, CollaborationUser } from "../src/endurance/collaboration/types";
import type { BoxCallState } from "../src/endurance/collaboration/types";
import type { EnduranceLiveSession } from "../src/endurance/models/LiveSession";
import type {
  DemoOverlayPreset,
  LauncherStartMode,
  LauncherStatus,
  LauncherWindowMode,
  TelemetryEnvelope,
} from "../src/types/ipc";
import type { BetaRegisterInput } from "../src/types/betaUser";
import type { OverlayPanelPrefs } from "../src/types/overlayPrefs";

contextBridge.exposeInMainWorld("ath", {
  platform: process.platform,
  launcher: {
    start: (mode: LauncherStartMode, demoPreset?: DemoOverlayPreset) =>
      ipcRenderer.invoke("ath:launcher-start", mode, demoPreset),
    setDemoPreset: (preset: DemoOverlayPreset) =>
      ipcRenderer.invoke("ath:launcher-demo-preset", preset),
    stop: () => ipcRenderer.invoke("ath:launcher-stop"),
    getStatus: (): Promise<LauncherStatus> =>
      ipcRenderer.invoke("ath:launcher-get-status"),
    onStatus: (callback: (status: LauncherStatus) => void) => {
      const handler = (_event: unknown, status: LauncherStatus) =>
        callback(status);
      ipcRenderer.on("ath:launcher-status", handler);
      return () => ipcRenderer.removeListener("ath:launcher-status", handler);
    },
    setWindowMode: (mode: LauncherWindowMode): Promise<void> =>
      ipcRenderer.invoke("ath:launcher-set-window-mode", mode),
    getBetaUser: () => ipcRenderer.invoke("ath:beta-user-get"),
    registerBetaUser: (input: BetaRegisterInput) =>
      ipcRenderer.invoke("ath:beta-user-register", input),
  },
  endurance: {
    load: (): Promise<EndurancePlan> =>
      ipcRenderer.invoke("ath:endurance-load"),
    save: (plan: EndurancePlan): Promise<void> =>
      ipcRenderer.invoke("ath:endurance-save", plan),
    open: (): Promise<void> => ipcRenderer.invoke("ath:endurance-open"),
    onPlanUpdated: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on("ath:endurance-plan-updated", handler);
      return () =>
        ipcRenderer.removeListener("ath:endurance-plan-updated", handler);
    },
    getLiveSession: (): Promise<EnduranceLiveSession | null> =>
      ipcRenderer.invoke("ath:endurance-live-get"),
    onLiveSession: (callback: (snapshot: EnduranceLiveSession) => void) => {
      const handler = (_event: unknown, snapshot: EnduranceLiveSession) =>
        callback(snapshot);
      ipcRenderer.on("ath:endurance-live", handler);
      return () =>
        ipcRenderer.removeListener("ath:endurance-live", handler);
    },
    getLiveRace: (): Promise<import("../src/endurance/live/models").LiveRaceSnapshot | null> =>
      ipcRenderer.invoke("ath:endurance-live-race-get"),
    onLiveRace: (
      callback: (
        snapshot: import("../src/endurance/live/models").LiveRaceSnapshot,
      ) => void,
    ) => {
      const handler = (
        _event: unknown,
        snapshot: import("../src/endurance/live/models").LiveRaceSnapshot,
      ) => callback(snapshot);
      ipcRenderer.on("ath:endurance-live-race", handler);
      return () =>
        ipcRenderer.removeListener("ath:endurance-live-race", handler);
    },
    exportStrategyPdf: (
      html: string,
      defaultName: string,
    ): Promise<{ saved: boolean; filePath?: string }> =>
      ipcRenderer.invoke("ath:endurance-export-pdf", html, defaultName),
    collabStartHost: (plan: EndurancePlan): Promise<CollaborationHostInfo> =>
      ipcRenderer.invoke("ath:endurance-collab-start-host", plan),
    collabPushPlan: (plan: EndurancePlan, revision: number): Promise<void> =>
      ipcRenderer.invoke("ath:endurance-collab-push-plan", plan, revision),
    collabPushBoxCall: (
      active: boolean,
      message?: string | null,
      preset?: import("../src/endurance/collaboration/types").RadioPresetId | null,
    ): Promise<BoxCallState | null> =>
      ipcRenderer.invoke(
        "ath:endurance-collab-push-box-call",
        active,
        message ?? null,
        preset ?? null,
      ),
    collabStopHost: (): Promise<void> =>
      ipcRenderer.invoke("ath:endurance-collab-stop-host"),
    collabEnsureLocalRelay: (): Promise<{ url: string; port: number }> =>
      ipcRenderer.invoke("ath:endurance-collab-ensure-local-relay"),
    onCollabPlan: (callback: (plan: EndurancePlan, revision: number) => void) => {
      const handler = (
        _event: unknown,
        plan: EndurancePlan,
        revision: number,
      ) => callback(plan, revision);
      ipcRenderer.on("ath:endurance-collab-plan", handler);
      return () =>
        ipcRenderer.removeListener("ath:endurance-collab-plan", handler);
    },
    onCollabUsers: (callback: (users: CollaborationUser[]) => void) => {
      const handler = (_event: unknown, users: CollaborationUser[]) =>
        callback(users);
      ipcRenderer.on("ath:endurance-collab-users", handler);
      return () =>
        ipcRenderer.removeListener("ath:endurance-collab-users", handler);
    },
    onCollabBoxCall: (callback: (state: BoxCallState) => void) => {
      const handler = (_event: unknown, state: BoxCallState) => callback(state);
      ipcRenderer.on("ath:endurance-collab-box-call", handler);
      return () =>
        ipcRenderer.removeListener("ath:endurance-collab-box-call", handler);
    },
  },
  boxCall: {
    get: (): Promise<BoxCallState> => ipcRenderer.invoke("ath:box-call-get"),
    toggle: (): Promise<BoxCallState> =>
      ipcRenderer.invoke("ath:box-call-toggle"),
    set: (payload: {
      active: boolean;
      message?: string | null;
      preset?: import("../src/endurance/collaboration/types").RadioPresetId | null;
      byName?: string | null;
    }): Promise<BoxCallState> => ipcRenderer.invoke("ath:box-call-set", payload),
    apply: (state: BoxCallState): Promise<BoxCallState> =>
      ipcRenderer.invoke("ath:box-call-apply", state),
    onChange: (callback: (state: BoxCallState) => void) => {
      const handler = (_event: unknown, state: BoxCallState) => callback(state);
      ipcRenderer.on("ath:box-call", handler);
      return () => ipcRenderer.removeListener("ath:box-call", handler);
    },
  },
  overlay: {
    ready: (): Promise<TelemetryEnvelope | null> =>
      ipcRenderer.invoke("ath:overlay-ready"),
    getSnapshot: (): Promise<TelemetryEnvelope | null> =>
      ipcRenderer.invoke("ath:overlay-get-snapshot"),
    onTelemetry: (callback: (payload: TelemetryEnvelope) => void) => {
      const handler = (_event: unknown, payload: TelemetryEnvelope) =>
        callback(payload);
      ipcRenderer.on("ath:telemetry", handler);
      return () => ipcRenderer.removeListener("ath:telemetry", handler);
    },
    setPointerPassthrough: (ignore: boolean) => {
      ipcRenderer.send("ath:overlay-pointer", ignore);
    },
    getPrefs: (): Promise<OverlayPanelPrefs> =>
      ipcRenderer.invoke("ath:overlay-prefs-get"),
    setPrefs: (prefs: OverlayPanelPrefs): Promise<OverlayPanelPrefs> =>
      ipcRenderer.invoke("ath:overlay-prefs-set", prefs),
    suspendRadioHotkeys: (): Promise<void> =>
      ipcRenderer.invoke("ath:radio-hotkeys-suspend"),
    resumeRadioHotkeys: (): Promise<void> =>
      ipcRenderer.invoke("ath:radio-hotkeys-resume"),
    triggerRadioHotkey: (
      id: import("../src/types/overlayPrefs").RadioHotkeyId,
    ): Promise<void> => ipcRenderer.invoke("ath:radio-hotkey-trigger", id),
    getWheelInputStatus: (): Promise<{
      ok: boolean;
      devices: string[];
      error: string | null;
    }> => ipcRenderer.invoke("ath:wheel-input-status"),
    listenWheelInput: (): Promise<{ code: string; label: string } | null> =>
      ipcRenderer.invoke("ath:wheel-input-listen"),
    cancelWheelInputListen: (): Promise<void> =>
      ipcRenderer.invoke("ath:wheel-input-cancel-listen"),
    onPrefs: (callback: (prefs: OverlayPanelPrefs) => void) => {
      const handler = (_event: unknown, prefs: OverlayPanelPrefs) =>
        callback(prefs);
      ipcRenderer.on("ath:overlay-prefs", handler);
      return () => ipcRenderer.removeListener("ath:overlay-prefs", handler);
    },
  },
});
