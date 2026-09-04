import type {
  DemoOverlayPreset,
  LauncherStartMode,
  LauncherStatus,
  TelemetryEnvelope,
} from "../../src/types/ipc";
import type { OverlayPanelPrefs } from "../../src/types/overlayPrefs";
import { DEFAULT_OVERLAY_PREFS } from "../../src/types/overlayPrefs";
import { BrowserWindow } from "electron";
import { sendToOverlay } from "../sendToOverlay";
import { MockTelemetryService } from "./MockTelemetryService";
import type { IracingTelemetryService } from "./IracingTelemetryService";

export class TelemetryController {
  private mock: MockTelemetryService | null = null;
  private iracing: IracingTelemetryService | null = null;
  private iracingLoading: Promise<IracingTelemetryService> | null = null;
  private active: LauncherStartMode | null = null;
  private demoPreset: DemoOverlayPreset | null = null;
  private overlayWindow: BrowserWindow | null = null;
  private statusTimer: ReturnType<typeof setInterval> | null = null;
  private lastEnvelope: TelemetryEnvelope | null = null;
  private panelPrefs: OverlayPanelPrefs = { ...DEFAULT_OVERLAY_PREFS };

  constructor(
    private getOverlayWindow: () => BrowserWindow | null,
    private onStatus: (status: LauncherStatus) => void,
  ) {}

  private getMock(): MockTelemetryService {
    if (!this.mock) this.mock = new MockTelemetryService();
    return this.mock;
  }

  private async getIracing(): Promise<IracingTelemetryService> {
    if (this.iracing) return this.iracing;
    if (!this.iracingLoading) {
      this.iracingLoading = import("./IracingTelemetryService").then(
        ({ IracingTelemetryService }) => {
          const service = new IracingTelemetryService();
          service.setPanelPrefs(this.panelPrefs);
          this.iracing = service;
          return service;
        },
      );
    }
    return this.iracingLoading;
  }

  setPanelPrefs(prefs: OverlayPanelPrefs): void {
    this.panelPrefs = prefs;
    this.iracing?.setPanelPrefs(prefs);
    if (this.lastEnvelope) {
      this.publishEnvelope({
        ...this.lastEnvelope,
        panelPrefs: prefs,
      });
    }
  }

  getPanelPrefs(): OverlayPanelPrefs {
    return this.panelPrefs;
  }

  async start(
    mode: LauncherStartMode,
    demoPreset: DemoOverlayPreset = "racing",
  ): Promise<void> {
    await this.stop();
    this.active = mode;
    this.demoPreset = mode === "demo" ? demoPreset : null;
    this.overlayWindow = this.getOverlayWindow();

    const publish = (envelope: TelemetryEnvelope) => {
      this.publishEnvelope({
        ...envelope,
        panelPrefs: this.panelPrefs,
      });
    };

    if (mode === "demo") {
      this.getMock().start(publish, demoPreset);
    } else {
      const iracing = await this.getIracing();
      await iracing.start(publish);
    }

    this.startStatusPolling();
    this.broadcastStatus();
  }

  private publishEnvelope(envelope: TelemetryEnvelope): void {
    this.lastEnvelope = envelope;
    this.applyOverlayVisibility(envelope.viewMode);
    const win = this.getOverlayWindow();
    if (win && !win.isDestroyed()) {
      sendToOverlay(win, "ath:telemetry", envelope);
    }
  }

  getLastEnvelope(): TelemetryEnvelope | null {
    return this.lastEnvelope;
  }

  resendLast(): void {
    if (!this.lastEnvelope) return;
    const win = this.getOverlayWindow();
    if (win && !win.isDestroyed()) {
      this.applyOverlayVisibility(this.lastEnvelope.viewMode);
      sendToOverlay(win, "ath:telemetry", this.lastEnvelope);
    }
  }

  async setDemoPreset(preset: DemoOverlayPreset): Promise<void> {
    if (this.active !== "demo") {
      await this.start("demo", preset);
      return;
    }
    this.demoPreset = preset;
    this.getMock().setPreset(preset);
    this.broadcastStatus();
  }

  async stop(): Promise<void> {
    this.mock?.stop();
    this.iracing?.stop();
    this.active = null;
    this.demoPreset = null;
    this.lastEnvelope = null;
    if (this.statusTimer) {
      clearInterval(this.statusTimer);
      this.statusTimer = null;
    }
    this.applyOverlayVisibility("hidden");
    this.broadcastStatus();
  }

  async getStatus(): Promise<LauncherStatus> {
    const iracingRunning =
      this.active === "sdk"
        ? await (this.iracing?.isSimRunning() ?? Promise.resolve(false))
        : false;
    const sdkLive =
      this.active === "sdk" && this.lastEnvelope?.connected === true;
    return {
      overlayActive: this.active !== null,
      iracingRunning,
      connected: this.active === "demo" ? true : sdkLive,
      source: this.active === "demo" ? "mock" : this.active === "sdk" ? "sdk" : null,
      viewMode: this.lastEnvelope?.viewMode ?? null,
      demoPreset: this.demoPreset,
      error: this.active === "sdk" ? (this.iracing?.getLastError() ?? null) : null,
    };
  }

  private startStatusPolling(): void {
    if (this.statusTimer) clearInterval(this.statusTimer);
    this.statusTimer = setInterval(() => this.broadcastStatus(), 2000);
  }

  private async broadcastStatus(): Promise<void> {
    this.onStatus(await this.getStatus());
  }

  private isLauncherVisible(): boolean {
    return BrowserWindow.getAllWindows().some(
      (w) =>
        !w.isDestroyed() &&
        w.isVisible() &&
        w.getTitle().includes("Launcher"),
    );
  }

  private applyOverlayVisibility(viewMode: TelemetryEnvelope["viewMode"]): void {
    const win = this.getOverlayWindow();
    if (!win || win.isDestroyed()) return;

    if (viewMode === "hidden") {
      win.hide();
    } else {
      if (!win.isVisible()) win.showInactive();
      if (!this.isLauncherVisible()) {
        win.moveTop();
      } else {
        this.keepLauncherAboveOverlay();
      }
    }
  }

  /** Le launcher reste cliquable au-dessus de l’overlay plein écran. */
  private keepLauncherAboveOverlay(): void {
    const launcher = BrowserWindow.getAllWindows().find(
      (w) =>
        !w.isDestroyed() &&
        w.isVisible() &&
        w.getTitle().includes("Launcher"),
    );
    if (launcher) {
      launcher.setAlwaysOnTop(true, "floating", 2);
      launcher.moveTop();
    }
  }
}
