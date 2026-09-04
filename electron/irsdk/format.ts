export function formatLapTime(seconds: number | undefined | null): string {
  if (seconds == null || seconds < 0 || seconds >= 99999 || !Number.isFinite(seconds)) {
    return "—";
  }
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, "0")}`;
}

export { formatRelativeTrackGap, computeTrackGapSeconds } from "../../src/utils/trackGap";

export function formatGapSeconds(seconds: number | undefined | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0.0005) {
    return "—";
  }
  return `+${seconds.toFixed(3)}`;
}

export function formatSectorTime(seconds: number | undefined | null): string {
  if (seconds == null || seconds < 0 || !Number.isFinite(seconds)) {
    return "—";
  }
  // Même convention d’affichage qu’iRacing (troncature au millième).
  const ms = Math.floor(seconds * 1000 + 1e-6);
  return (ms / 1000).toFixed(3);
}

export function msToLapTime(ms: number | undefined | null): string {
  if (ms == null || ms < 0 || !Number.isFinite(ms)) return "—";
  return formatLapTime(ms / 1000);
}

export function sessionTimeRemainLabel(seconds: number | undefined | null): string {
  if (seconds == null || seconds < 0 || !Number.isFinite(seconds)) return "—";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
