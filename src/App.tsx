import { useMemo } from "react";
import { RacingOverlay } from "./overlays/RacingOverlay";
import { GarageOverlay } from "./overlays/GarageOverlay";
import { OverlayBootScreen } from "./components/OverlayBootScreen";
import { useOverlayTelemetry } from "./hooks/useOverlayTelemetry";
import { useOverlayPointerPassthrough } from "./hooks/useOverlayPointerPassthrough";

type UrlMode = "auto" | "racing" | "garage";

function parseUrlMode(): UrlMode {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  if (mode === "garage") return "garage";
  if (mode === "racing") return "racing";
  return "auto";
}

export function App() {
  const urlMode = useMemo(parseUrlMode, []);
  const envelope = useOverlayTelemetry(urlMode);
  const overlayUiActive = envelope.viewMode !== "hidden";
  useOverlayPointerPassthrough(overlayUiActive);

  if (envelope.viewMode === "hidden") {
    return <OverlayBootScreen />;
  }

  if (envelope.viewMode === "garage") {
    if (envelope.garage) {
      return <GarageOverlay data={envelope.garage} />;
    }
    return <OverlayBootScreen />;
  }

  if (envelope.racing) {
    return (
      <RacingOverlay
        data={envelope.racing}
        demoPreset={envelope.demoPreset}
        panelPrefs={envelope.panelPrefs}
      />
    );
  }

  return <OverlayBootScreen />;
}
