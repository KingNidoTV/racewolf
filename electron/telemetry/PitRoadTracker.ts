import { readPlayerRaceContext } from "../irsdk/playerRaceContext";

export interface PitRoadTransition {
  onPit: boolean;
  enteredPit: boolean;
  exitedPit: boolean;
}

/** Détecte entrée / sortie des stands. */
export class PitRoadTracker {
  private onPit = false;

  tick(telemetry: Record<string, unknown>): PitRoadTransition {
    const { onPit } = readPlayerRaceContext(telemetry);
    const enteredPit = !this.onPit && onPit;
    const exitedPit = this.onPit && !onPit;
    this.onPit = onPit;
    return { onPit, enteredPit, exitedPit };
  }

  reset(): void {
    this.onPit = false;
  }
}
