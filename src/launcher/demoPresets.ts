import type { DemoOverlayPreset } from "../types/ipc";

export const DEMO_OVERLAY_BUTTONS: {
  id: DemoOverlayPreset;
  label: string;
}[] = [
  { id: "racing", label: "Course (complet)" },
  { id: "garage", label: "Garage" },
  { id: "standings-practice", label: "Classement P/Q" },
  { id: "standings-race", label: "Classement course" },
  { id: "timing", label: "Chronos" },
  { id: "trackmap", label: "Circuit" },
  { id: "relative", label: "Relatif" },
  { id: "strategy", label: "Stratégie" },
  { id: "boxcall", label: "Radio" },
  { id: "hud", label: "ATH" },
  { id: "flags", label: "Drapeaux piste" },
];

export function demoPresetLabel(preset: DemoOverlayPreset | null): string | null {
  if (!preset) return null;
  return DEMO_OVERLAY_BUTTONS.find((b) => b.id === preset)?.label ?? preset;
}
