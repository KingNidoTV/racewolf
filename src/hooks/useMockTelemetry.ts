import { useEffect, useState } from "react";
import { MOCK_GARAGE, MOCK_RACING } from "../data/mockTelemetry";
import type {
  GarageTelemetry,
  RacingTelemetry,
  TelemetryState,
} from "../types/telemetry";

type OverlayMode = "racing" | "garage";

export function useMockTelemetry(mode: "garage"): GarageTelemetry;
export function useMockTelemetry(mode: "racing"): RacingTelemetry;
export function useMockTelemetry(mode: OverlayMode): TelemetryState {
  const [racing, setRacing] = useState<RacingTelemetry>(MOCK_RACING);
  const [garage] = useState<GarageTelemetry>(MOCK_GARAGE);

  useEffect(() => {
    if (mode !== "racing") return;

    const id = window.setInterval(() => {
      setRacing((prev) => {
        const speedDelta = (Math.random() - 0.5) * 8;
        const rpmDelta = speedDelta * 40;
        const newSpeed = Math.max(
          0,
          Math.min(320, Math.round(prev.ath.speedKmh + speedDelta)),
        );
        const newRpm = Math.max(
          1200,
          Math.min(prev.ath.maxRpm, Math.round(prev.ath.rpm + rpmDelta)),
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

        const braking = Math.random() < 0.08;
        const throttle = Math.min(1, 0.35 + newSpeed / 320);

        return {
          ...prev,
          ath: {
            ...prev.ath,
            speedKmh: newSpeed,
            rpm: newRpm,
            gear,
            fuelLiters: Math.max(0, prev.ath.fuelLiters - 0.02),
            fuelPercent: Math.max(0, prev.ath.fuelPercent - 0.01),
            throttle: braking ? 0.1 : throttle,
            brake: braking ? 0.65 : 0,
            drsActive: newSpeed > 200,
          },
        };
      });
    }, 100);

    return () => window.clearInterval(id);
  }, [mode]);

  return mode === "garage" ? garage : racing;
}
