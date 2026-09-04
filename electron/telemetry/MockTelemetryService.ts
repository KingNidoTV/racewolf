import type { DemoOverlayPreset, TelemetryEnvelope } from "../../src/types/ipc";
import type {
  GarageTelemetry,
  RacingTelemetry,
} from "../../src/types/telemetry";
import {
  DEMO_TRACK_FLAG_CYCLE,
  MOCK_GARAGE,
} from "../../src/data/mockTelemetry";
import { mockRacingForPreset } from "./mockRacingForPreset";

const TICK_MS = 100;

function cloneMock<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class MockTelemetryService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private racing = mockRacingForPreset("racing");
  private garage = cloneMock(MOCK_GARAGE) as GarageTelemetry;
  private preset: DemoOverlayPreset = "racing";
  private onUpdate: ((payload: TelemetryEnvelope) => void) | null = null;
  private flagCycleTimer: ReturnType<typeof setInterval> | null = null;
  private flagCycleIndex = 0;

  start(
    onUpdate: (payload: TelemetryEnvelope) => void,
    preset: DemoOverlayPreset = "racing",
  ): void {
    this.stop();
    this.onUpdate = onUpdate;
    this.preset = preset;
    this.racing = mockRacingForPreset(preset);
    this.garage = cloneMock(MOCK_GARAGE) as GarageTelemetry;

    this.syncFlagCycleTimer(preset);

    this.timer = setInterval(() => {
      const speedDelta = (Math.random() - 0.5) * 8;
      const rpmDelta = speedDelta * 40;
      const newSpeed = Math.max(
        0,
        Math.min(320, Math.round(this.racing.ath.speedKmh + speedDelta)),
      );
      const newRpm = Math.max(
        1200,
        Math.min(
          this.racing.ath.maxRpm,
          Math.round(this.racing.ath.rpm + rpmDelta),
        ),
      );
      const gear =
        newSpeed < 60
          ? 2
          : newSpeed < 100
            ? 3
            : newSpeed < 140
              ? 4
              : newSpeed < 180
                ? 5
                : 6;

      const throttle = Math.min(1, 0.35 + newSpeed / 320);
      const braking = Math.random() < 0.08;

      this.racing = {
        ...this.racing,
        ath: {
          ...this.racing.ath,
          speedKmh: newSpeed,
          rpm: newRpm,
          gear,
          fuelLiters: Math.max(0, this.racing.ath.fuelLiters - 0.02),
          fuelPercent: Math.max(0, this.racing.ath.fuelPercent - 0.01),
          throttle: braking ? 0.1 : throttle,
          brake: braking ? 0.65 : 0,
          drsActive: newSpeed > 200,
          batteryPercent:
            this.racing.ath.batteryPercent != null
              ? Math.max(0, this.racing.ath.batteryPercent - 0.05)
              : null,
          pushToPassPercent:
            this.racing.ath.pushToPassPercent != null
              ? Math.max(0, this.racing.ath.pushToPassPercent - 0.08)
              : null,
        },
      };

      this.publish();
    }, TICK_MS);

    this.publish();
  }

  setPreset(preset: DemoOverlayPreset): void {
    this.preset = preset;
    const ath = this.racing.ath;
    this.racing = { ...mockRacingForPreset(preset), ath };
    this.syncFlagCycleTimer(preset);
    this.publish();
  }

  flush(): void {
    this.publish();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.flagCycleTimer) clearInterval(this.flagCycleTimer);
    this.timer = null;
    this.flagCycleTimer = null;
    this.onUpdate = null;
  }

  private syncFlagCycleTimer(preset: DemoOverlayPreset): void {
    if (this.flagCycleTimer) {
      clearInterval(this.flagCycleTimer);
      this.flagCycleTimer = null;
    }
    if (preset === "flags") {
      this.flagCycleIndex = 0;
      this.applyDemoTrackFlag();
      this.flagCycleTimer = setInterval(() => {
        this.flagCycleIndex =
          (this.flagCycleIndex + 1) % DEMO_TRACK_FLAG_CYCLE.length;
        this.applyDemoTrackFlag();
      }, 4500);
      return;
    }
    if (!this.racing.trackFlag) {
      this.racing = {
        ...this.racing,
        trackFlag: DEMO_TRACK_FLAG_CYCLE[1] ?? null,
      };
    }
  }

  private applyDemoTrackFlag(): void {
    const trackFlag = DEMO_TRACK_FLAG_CYCLE[this.flagCycleIndex] ?? null;
    this.racing = { ...this.racing, trackFlag };
    this.publish();
  }

  private publish(): void {
    if (!this.onUpdate) return;

    const viewMode = this.preset === "garage" ? "garage" : "racing";
    this.onUpdate({
      viewMode,
      source: "mock",
      connected: true,
      iracingRunning: false,
      racing: this.racing,
      garage: this.garage,
      demoPreset: this.preset,
    });
  }
}
