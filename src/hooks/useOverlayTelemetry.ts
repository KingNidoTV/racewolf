import { useEffect, useMemo, useState } from "react";
import type { TelemetryEnvelope } from "../types/ipc";
import { useMockTelemetry } from "./useMockTelemetry";
import type { GarageTelemetry, RacingTelemetry } from "../types/telemetry";

const EMPTY: TelemetryEnvelope = {
  viewMode: "hidden",
  source: "mock",
  connected: false,
  iracingRunning: false,
  racing: null,
  garage: null,
};

function demoPlaceholder(
  mockRacing: RacingTelemetry,
  mockGarage: GarageTelemetry,
): TelemetryEnvelope {
  return {
    viewMode: "racing",
    source: "mock",
    connected: true,
    iracingRunning: false,
    racing: mockRacing,
    garage: mockGarage,
  };
}

export function useOverlayTelemetry(
  urlMode: "auto" | "racing" | "garage",
): TelemetryEnvelope {
  const [ipcEnvelope, setIpcEnvelope] = useState<TelemetryEnvelope | null>(null);
  const mockRacing = useMockTelemetry("racing") as RacingTelemetry;
  const mockGarage = useMockTelemetry("garage") as GarageTelemetry;

  const hasBridge =
    typeof window !== "undefined" && Boolean(window.ath?.overlay);

  useEffect(() => {
    const overlay = window.ath?.overlay;
    if (!overlay) return;

    let cancelled = false;

    const apply = (payload: TelemetryEnvelope | null) => {
      if (!cancelled && payload) setIpcEnvelope(payload);
    };

    void overlay.getSnapshot().then(apply);

    void overlay.ready().then(apply);

    return overlay.onTelemetry((payload) => {
      setIpcEnvelope(payload);
    });
  }, []);

  return useMemo(() => {
    if (hasBridge) {
      if (ipcEnvelope) return ipcEnvelope;
      return EMPTY;
    }

    if (urlMode === "garage") {
      return {
        ...EMPTY,
        viewMode: "garage",
        connected: true,
        source: "mock",
        garage: mockGarage,
        racing: mockRacing,
      };
    }

    return demoPlaceholder(mockRacing, mockGarage);
  }, [hasBridge, ipcEnvelope, urlMode, mockRacing, mockGarage]);
}
