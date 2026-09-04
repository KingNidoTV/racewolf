import type { LiveRaceSnapshot } from "./models";

/** Mise à jour partielle du snapshot live (fusionnée par le hub). */
export type LiveTelemetryPatch = Partial<{
  session: Partial<LiveRaceSnapshot["session"]>;
  stint: Partial<LiveRaceSnapshot["stint"]>;
  fuel: Partial<LiveRaceSnapshot["fuel"]>;
}>;

/**
 * Contrat pour une source de télémétrie iRacing en course.
 * Implémentations : mock (dev), SDK (futur).
 */
export interface LiveTelemetryProvider {
  readonly id: string;
  readonly label: string;
  start(onUpdate: (patch: LiveTelemetryPatch) => void): void | Promise<void>;
  stop(): void;
  getSnapshot(): LiveRaceSnapshot;
}
