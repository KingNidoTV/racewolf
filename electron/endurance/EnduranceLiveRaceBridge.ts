import type { LiveRaceSnapshot } from "../../src/endurance/live/models";
import type { EnduranceTelemetryBridge } from "./EnduranceTelemetryBridge";

/**
 * Relais IPC pour le mode live — s'appuie sur le pont SDK endurance unique
 * (pas de second IRacingSDK).
 */
export class EnduranceLiveRaceBridge {
  private bridge: EnduranceTelemetryBridge | null = null;
  private onUpdate: ((snapshot: LiveRaceSnapshot) => void) | null = null;

  attach(bridge: EnduranceTelemetryBridge): void {
    this.bridge = bridge;
    if (this.onUpdate) {
      this.onUpdate(bridge.getLiveRaceSnapshot());
    }
  }

  start(onUpdate: (snapshot: LiveRaceSnapshot) => void): void {
    this.onUpdate = onUpdate;
    if (this.bridge) {
      onUpdate(this.bridge.getLiveRaceSnapshot());
    }
  }

  push(snapshot: LiveRaceSnapshot): void {
    this.onUpdate?.(snapshot);
  }

  stop(): void {
    this.onUpdate = null;
  }
}
