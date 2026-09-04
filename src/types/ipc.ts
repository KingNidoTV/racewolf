import type { EndurancePlan } from "../endurance/models";
import type { EnduranceLiveSession } from "../endurance/models/LiveSession";
import type { LiveRaceSnapshot } from "../endurance/live/models";
import type {
  CollaborationHostInfo,
  CollaborationUser,
  BoxCallState,
  RadioPresetId,
} from "../endurance/collaboration/types";
import type { OverlayPanelPrefs } from "./overlayPrefs";
import type { GarageTelemetry, RacingTelemetry } from "./telemetry";
import type {
  BetaRegisterInput,
  BetaRegisterResult,
  BetaUserProfile,
} from "./betaUser";

export type { OverlayPanelPrefs } from "./overlayPrefs";

export type OverlayViewMode = "racing" | "garage" | "hidden";
export type TelemetrySource = "sdk" | "mock";

export interface TelemetryEnvelope {
  viewMode: OverlayViewMode;
  source: TelemetrySource;
  connected: boolean;
  iracingRunning: boolean;
  racing: RacingTelemetry | null;
  garage: GarageTelemetry | null;
  /** Démo : n’afficher qu’un panneau course (ou tout si "racing"). */
  demoPreset?: DemoOverlayPreset | null;
  /** Panneaux visibles en mode course complet / live. */
  panelPrefs?: OverlayPanelPrefs;
}

export type LauncherStartMode = "sdk" | "demo";
export type LauncherWindowMode = "home" | "preview" | "endurance";

/** Aperçu démo d’un panneau ou de l’overlay complet. */
export type DemoOverlayPreset =
  | "racing"
  | "garage"
  | "standings-practice"
  | "standings-race"
  | "timing"
  | "trackmap"
  | "relative"
  | "strategy"
  | "boxcall"
  | "hud"
  | "flags";

export interface LauncherStatus {
  overlayActive: boolean;
  iracingRunning: boolean;
  connected: boolean;
  source: TelemetrySource | null;
  viewMode: OverlayViewMode | null;
  demoPreset: DemoOverlayPreset | null;
  error: string | null;
}

export interface AthBridge {
  platform: string;
  endurance?: {
    load: () => Promise<EndurancePlan>;
    save: (plan: EndurancePlan) => Promise<void>;
    open: () => Promise<void>;
    onPlanUpdated: (callback: () => void) => () => void;
    getLiveSession: () => Promise<EnduranceLiveSession | null>;
    onLiveSession: (
      callback: (snapshot: EnduranceLiveSession) => void,
    ) => () => void;
    getLiveRace: () => Promise<LiveRaceSnapshot | null>;
    onLiveRace: (callback: (snapshot: LiveRaceSnapshot) => void) => () => void;
    exportStrategyPdf: (
      html: string,
      defaultName: string,
    ) => Promise<{ saved: boolean; filePath?: string }>;
    collabStartHost: (plan: EndurancePlan) => Promise<CollaborationHostInfo>;
    collabPushPlan: (plan: EndurancePlan, revision: number) => Promise<void>;
    collabPushBoxCall: (
      active: boolean,
      message?: string | null,
      preset?: RadioPresetId | null,
    ) => Promise<BoxCallState | null>;
    collabStopHost: () => Promise<void>;
    collabEnsureLocalRelay: () => Promise<{ url: string; port: number }>;
    onCollabPlan: (
      callback: (plan: EndurancePlan, revision: number) => void,
    ) => () => void;
    onCollabUsers: (callback: (users: CollaborationUser[]) => void) => () => void;
    onCollabBoxCall: (callback: (state: BoxCallState) => void) => () => void;
  };
  boxCall?: {
    get: () => Promise<BoxCallState>;
    toggle: () => Promise<BoxCallState>;
    set: (payload: {
      active: boolean;
      message?: string | null;
      preset?: RadioPresetId | null;
      byName?: string | null;
    }) => Promise<BoxCallState>;
    apply: (state: BoxCallState) => Promise<BoxCallState>;
    onChange: (callback: (state: BoxCallState) => void) => () => void;
  };
  launcher: {
    start: (mode: LauncherStartMode, demoPreset?: DemoOverlayPreset) => Promise<void>;
    setDemoPreset: (preset: DemoOverlayPreset) => Promise<void>;
    stop: () => Promise<void>;
    getStatus: () => Promise<LauncherStatus>;
    onStatus: (callback: (status: LauncherStatus) => void) => () => void;
    setWindowMode: (mode: LauncherWindowMode) => Promise<void>;
    getBetaUser: () => Promise<BetaUserProfile | null>;
    registerBetaUser: (input: BetaRegisterInput) => Promise<BetaRegisterResult>;
  };
  overlay: {
    ready: () => Promise<TelemetryEnvelope | null>;
    getSnapshot: () => Promise<TelemetryEnvelope | null>;
    onTelemetry: (callback: (payload: TelemetryEnvelope) => void) => () => void;
    /** true = clics traversent vers iRacing ; false = UI cliquable */
    setPointerPassthrough: (ignore: boolean) => void;
    getPrefs: () => Promise<OverlayPanelPrefs>;
    setPrefs: (prefs: OverlayPanelPrefs) => Promise<OverlayPanelPrefs>;
    suspendRadioHotkeys?: () => Promise<void>;
    resumeRadioHotkeys?: () => Promise<void>;
    triggerRadioHotkey?: (
      id: import("./overlayPrefs").RadioHotkeyId,
    ) => Promise<void>;
    getWheelInputStatus?: () => Promise<{
      ok: boolean;
      devices: string[];
      error: string | null;
    }>;
    listenWheelInput?: () => Promise<{ code: string; label: string } | null>;
    cancelWheelInputListen?: () => Promise<void>;
    onPrefs: (callback: (prefs: OverlayPanelPrefs) => void) => () => void;
  };
}
