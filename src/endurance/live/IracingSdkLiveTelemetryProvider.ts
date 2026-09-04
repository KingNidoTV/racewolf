import type { EnduranceLiveSession } from "../models/LiveSession";
import type { LiveTelemetryPatch, LiveTelemetryProvider } from "./LiveTelemetryProvider";
import type { LiveRaceSnapshot } from "./models";
import { DEFAULT_LIVE_RACE_SNAPSHOT, DEFAULT_LIVE_SESSION } from "./models";
import { mapPrepSessionToLivePatch } from "./mapPrepLiveSession";

function applySnapshot(
  target: LiveRaceSnapshot,
  snap: LiveRaceSnapshot,
): LiveRaceSnapshot {
  return {
    session: { ...target.session, ...snap.session },
    stint: { ...target.stint, ...snap.stint },
    fuel: { ...target.fuel, ...snap.fuel },
    strategy: snap.strategy,
  };
}

/**
 * Fournisseur SDK iRacing via IPC Electron (course + session préparation).
 */
export class IracingSdkLiveTelemetryProvider implements LiveTelemetryProvider {
  readonly id = "sdk";
  readonly label = "iRacing SDK";

  private snapshot: LiveRaceSnapshot = structuredClone(DEFAULT_LIVE_RACE_SNAPSHOT);
  private unsubscribeRace: (() => void) | null = null;
  private unsubscribePrep: (() => void) | null = null;

  start(onUpdate: (patch: LiveTelemetryPatch) => void): void {
    this.stop();

    const endurance = window.ath?.endurance;
    if (!endurance?.onLiveRace) {
      this.snapshot.session = {
        ...DEFAULT_LIVE_SESSION,
        source: "sdk",
        error: "IPC endurance indisponible — lancez l'application Electron.",
        updatedAt: new Date().toISOString(),
      };
      onUpdate({ session: this.snapshot.session });
      return;
    }

    const pushRace = (snap: LiveRaceSnapshot) => {
      this.snapshot = applySnapshot(this.snapshot, snap);
      onUpdate({
        session: snap.session,
        stint: snap.stint,
        fuel: snap.fuel,
      });
    };

    const pushPrep = (prep: EnduranceLiveSession) => {
      const patch = mapPrepSessionToLivePatch(prep);
      if (patch.session) {
        this.snapshot.session = {
          ...this.snapshot.session,
          ...patch.session,
        };
      }
      onUpdate(patch);
    };

    void endurance.getLiveRace?.().then((snap) => {
      if (snap) {
        pushRace(snap);
      } else {
        onUpdate({
          session: {
            ...DEFAULT_LIVE_SESSION,
            source: "sdk",
            iracingRunning: false,
            error: "En attente de la première trame iRacing…",
            updatedAt: new Date().toISOString(),
          },
        });
      }
    });

    void endurance.getLiveSession?.().then((prep) => {
      if (prep) pushPrep(prep);
    });

    this.unsubscribeRace = endurance.onLiveRace(pushRace);
    this.unsubscribePrep = endurance.onLiveSession?.(pushPrep) ?? null;
  }

  stop(): void {
    this.unsubscribeRace?.();
    this.unsubscribeRace = null;
    this.unsubscribePrep?.();
    this.unsubscribePrep = null;
    this.snapshot.session.connected = false;
    this.snapshot.session.source = "none";
  }

  getSnapshot(): LiveRaceSnapshot {
    return structuredClone(this.snapshot);
  }
}
