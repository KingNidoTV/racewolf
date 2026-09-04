import { DEFAULT_CENTERLINE } from "../trackmap/geometry";

export {
  DEFAULT_CENTERLINE,
  DEFAULT_CENTERLINE as RING_CENTER_PATH,
};

/** @deprecated Utiliser `loadCenterline` depuis `src/trackmap/loadLayout`. */
export function resolveTrackCenterPath(_slug?: string): string {
  return DEFAULT_CENTERLINE;
}
