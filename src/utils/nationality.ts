/**
 * Nationalité pilote via FlairId iRacing (remplace les clubs, S3 2025).
 * Catalogue : src/data/iracing-flairs.json (lookup /data/lookup/flairs).
 */

import flairsJson from "../data/iracing-flairs.json";
import { extractDriverFlairId } from "./driverFlair";

type FlairRow = {
  flair_id: number;
  country_code?: string;
};

const FLAIR_TO_COUNTRY = new Map<number, string>();

/**
 * Codes iRacing non-ISO → slug d’asset (flagcdn / fichiers locaux).
 * Ne pas tronquer ENG/SCT/… en 2 lettres (sinon NI = Nicaragua, etc.).
 */
const COUNTRY_ASSET_ALIAS: Record<string, string> = {
  ENG: "gb-eng",
  SCT: "gb-sct",
  NIR: "gb-nir",
  WLS: "gb-wls",
  GO: "un",
  UN: "un",
  IR: "un",
};

for (const row of (flairsJson as { flairs: FlairRow[] }).flairs) {
  const raw = row.country_code?.trim().toUpperCase();
  if (!raw) continue;
  const aliased = COUNTRY_ASSET_ALIAS[raw];
  if (aliased) {
    FLAIR_TO_COUNTRY.set(row.flair_id, aliased);
    continue;
  }
  if (/^[A-Z]{2}$/.test(raw)) {
    FLAIR_TO_COUNTRY.set(row.flair_id, raw);
  }
}

for (const [id, code] of Object.entries({ 1: "un", 2: "un" })) {
  FLAIR_TO_COUNTRY.set(Number(id), code);
}

export function flairIdToCountryCode(flairId: unknown): string {
  const id = Number(flairId);
  if (!Number.isFinite(id) || id <= 0) return "";
  return FLAIR_TO_COUNTRY.get(id) ?? "";
}

export function resolveDriverNationalityFromDriver(
  driver: Record<string, unknown> | null | undefined,
  options?: { isPlayer?: boolean; flairIdFallback?: number },
): string {
  const fromDriver = extractDriverFlairId(driver);
  const flairId =
    fromDriver > 0 ? fromDriver : (options?.flairIdFallback ?? 0);
  return resolveDriverNationality(flairId, options);
}

/** Override local : localStorage.setItem('ath.playerNationality', 'CH') */
export function getPlayerNationalityOverride(): string {
  if (typeof localStorage === "undefined") return "";
  const raw = localStorage.getItem("ath.playerNationality")?.trim().toUpperCase();
  if (!raw) return "";
  if (/^[A-Z]{2}$/.test(raw)) return raw;
  return COUNTRY_ASSET_ALIAS[raw] ?? "";
}

export function resolveDriverNationality(
  flairId: unknown,
  options?: { isPlayer?: boolean },
): string {
  if (options?.isPlayer) {
    const mine = getPlayerNationalityOverride();
    if (mine) return mine;
  }
  return flairIdToCountryCode(flairId);
}

/** CarIdx → FlairId depuis le YAML session brut (si le parseur omet le champ). */
export function extractFlairIdsFromSessionYaml(
  yaml: string | null | undefined,
): Map<number, number> {
  const map = new Map<number, number>();
  if (!yaml) return map;

  let currentCarIdx: number | null = null;
  for (const line of yaml.split(/\r?\n/)) {
    const car = /^\s*-?\s*CarIdx:\s*(\d+)\s*$/.exec(line);
    if (car) {
      currentCarIdx = Number(car[1]);
      continue;
    }
    const flair = /^\s*FlairI[Dd]:\s*(\d+)\s*$/.exec(line);
    if (flair && currentCarIdx != null) {
      const id = Number(flair[1]);
      if (id > 0) map.set(currentCarIdx, id);
    }
  }
  return map;
}
