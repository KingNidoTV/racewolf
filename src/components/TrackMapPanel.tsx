import { TrackMap } from "../trackmap/TrackMap";
import type { TrackMapData } from "../types/telemetry";

interface Props {
  map: TrackMapData;
  lap?: number | null;
  timeLabel?: string | null;
}

/** Carte circuit circulaire (style radar) — `src/trackmap/`. */
export function TrackMapPanel({ map, lap = null, timeLabel = null }: Props) {
  return <TrackMap map={map} lap={lap} timeLabel={timeLabel} />;
}
