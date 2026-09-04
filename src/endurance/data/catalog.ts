import tracksData from "./tracks.json";
import carsData from "./cars.json";
import type { CatalogEntry, CarEntry } from "./catalogTypes";

export type { CatalogEntry, CarEntry };

const EXCLUDED_TRACK_CATEGORIES = new Set(["Oval", "Dirt Oval", "Rallycross"]);

const ALL_TRACKS: CatalogEntry[] = tracksData.tracks;

/** Circuits route uniquement (sans oval, dirt oval, rallycross). */
export const IRACING_TRACKS: CatalogEntry[] = ALL_TRACKS.filter(
  (track) =>
    track.category && !EXCLUDED_TRACK_CATEGORIES.has(track.category),
);

export const IRACING_CARS: CarEntry[] = carsData.cars;

export interface TrackVenueGroup {
  venue: string;
  layouts: CatalogEntry[];
}

const TRACK_LABEL_SEPARATOR = " — ";

export function trackVenueName(track: CatalogEntry): string {
  const idx = track.label.indexOf(TRACK_LABEL_SEPARATOR);
  return idx >= 0 ? track.label.slice(0, idx) : track.label;
}

export function layoutLabel(track: CatalogEntry): string {
  const idx = track.label.indexOf(TRACK_LABEL_SEPARATOR);
  if (idx < 0) return track.label;
  return track.label.slice(idx + TRACK_LABEL_SEPARATOR.length);
}

export function groupTracksByVenue(tracks: CatalogEntry[]): TrackVenueGroup[] {
  const map = new Map<string, CatalogEntry[]>();

  for (const track of tracks) {
    const venue = trackVenueName(track);
    const list = map.get(venue) ?? [];
    list.push(track);
    map.set(venue, list);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "fr"))
    .map(([venue, layouts]) => ({
      venue,
      layouts: layouts.sort((a, b) => a.label.localeCompare(b.label, "fr")),
    }));
}

export function findCarEntry(id: string): CarEntry | undefined {
  return IRACING_CARS.find((car) => car.id === id);
}

function catalogPool(entries: CatalogEntry[]): CatalogEntry[] {
  return entries === IRACING_TRACKS ? ALL_TRACKS : entries;
}

export function findCatalogEntry(
  entries: CatalogEntry[],
  id: string,
): CatalogEntry | undefined {
  return catalogPool(entries).find((e) => e.id === id);
}

export function findCatalogEntryByLabel(
  entries: CatalogEntry[],
  label: string,
): CatalogEntry | undefined {
  const needle = label.trim().toLowerCase();
  if (!needle) return undefined;
  return catalogPool(entries).find((e) => e.label.toLowerCase() === needle);
}

export function resolveCatalogSelection(
  entries: CatalogEntry[],
  id: string,
  fallbackLabel: string,
): { id: string; label: string } {
  const found = findCatalogEntry(entries, id);
  if (found) return { id: found.id, label: found.label };
  if (fallbackLabel.trim()) {
    const byLabel = findCatalogEntryByLabel(entries, fallbackLabel);
    if (byLabel) return { id: byLabel.id, label: byLabel.label };
    return { id: "", label: fallbackLabel };
  }
  return { id: "", label: "" };
}
