import type { SessionData } from "@irsdk-node/types";
import catalog from "../data/seriesCatalog.json";

type WeekendYaml = SessionData["WeekendInfo"] & {
  SeriesName?: string;
  SeasonName?: string;
  SeasonSeriesName?: string;
};

type SeriesCatalog = {
  bySeriesId: Record<string, string>;
  bySeasonId: Record<string, string>;
};

const SERIES_CATALOG = catalog as SeriesCatalog;

function readYamlString(
  obj: Record<string, unknown> | undefined,
  keys: string[],
): string | null {
  if (!obj) return null;
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function parseSeriesNameFromYaml(rawYaml: string | undefined): string | null {
  if (!rawYaml) return null;
  const match = rawYaml.match(/^\s*SeriesName:\s*(.+)$/m);
  if (!match?.[1]) return null;
  const value = match[1].trim();
  return value && value !== "," ? value : null;
}

function normalizeSeriesLabel(name: string): string {
  return name
    .replace(/\s+Series\s+Series/i, " Series")
    .replace(/\s*-\s*20\d{2}\s+Season.*$/i, "")
    .trim();
}

function withFixedSuffix(name: string, isFixedSetup: boolean): string {
  if (!isFixedSetup) return name;
  if (/\bfixed\b/i.test(name)) return name;
  return `${name} - Fixed`;
}

function lookupFromCatalog(weekend: WeekendYaml): string | null {
  const seasonId = weekend.SeasonID;
  if (seasonId > 0) {
    const fromSeason = SERIES_CATALOG.bySeasonId[String(seasonId)];
    if (fromSeason) return normalizeSeriesLabel(fromSeason);
  }

  const seriesId = weekend.SeriesID;
  if (seriesId > 0) {
    const fromSeries = SERIES_CATALOG.bySeriesId[String(seriesId)];
    if (fromSeries) return normalizeSeriesLabel(fromSeries);
  }

  return null;
}

/**
 * Titre série affiché (ex. « NASCAR Class C Series - Fixed »).
 * EventType = Practice/Qualify/Race — type de séance, pas le nom de série.
 */
export function resolveSeriesTitle(
  weekend: WeekendYaml | undefined,
  sessionYaml?: string,
): string {
  if (!weekend) return "iRacing";

  const raw = weekend as unknown as Record<string, unknown>;
  const fromYaml =
    readYamlString(raw, [
      "SeriesName",
      "SeasonSeriesName",
      "SeasonName",
      "Series",
    ]) ??
    parseSeriesNameFromYaml(sessionYaml) ??
    lookupFromCatalog(weekend);

  if (fromYaml) {
    return withFixedSuffix(
      normalizeSeriesLabel(fromYaml),
      weekend.WeekendOptions?.IsFixedSetup === 1,
    );
  }

  return "iRacing";
}
