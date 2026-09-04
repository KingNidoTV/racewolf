import type { DemoOverlayPreset } from "../../src/types/ipc";
import type { RacingTelemetry } from "../../src/types/telemetry";
import {
  MOCK_RACING_PRACTICE,
  MOCK_RACING_RACE,
} from "../../src/data/mockTelemetry";

function cloneMock<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Données course mock selon le preset démo (P/Q vs course). */
export function mockRacingForPreset(preset: DemoOverlayPreset): RacingTelemetry {
  if (preset === "standings-practice") {
    return cloneMock(MOCK_RACING_PRACTICE);
  }
  return cloneMock(MOCK_RACING_RACE);
}
