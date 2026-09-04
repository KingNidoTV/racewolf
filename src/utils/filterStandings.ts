import type { StandingsEntry } from "../types/telemetry";

export type StandingsListItem =
  | { kind: "row"; row: StandingsEntry }
  | { kind: "gap" }
  | { kind: "separator" };

export interface RaceStandingsOptions {
  topN?: number;
  ahead?: number;
  behind?: number;
  /** Afficher toutes les entries fournies (ex. leaders d'autres classes). */
  showAll?: boolean;
}

export interface RelativeStandingsOptions {
  ahead?: number;
  behind?: number;
}

function toSortedRows(entries: StandingsEntry[]): StandingsEntry[] {
  return [...entries].sort((a, b) => a.position - b.position);
}

function buildListWithGaps(rows: StandingsEntry[]): StandingsListItem[] {
  const items: StandingsListItem[] = [];
  let lastPos = 0;

  for (const row of rows) {
    if (lastPos > 0 && row.position > lastPos + 1) {
      items.push({ kind: "gap" });
    }
    items.push({ kind: "row", row });
    lastPos = row.position;
  }

  return items;
}

/**
 * Top N toujours visible.
 * Si le pilote est hors top N : séparateur puis avant / pilote / derrière.
 */
export function buildRaceStandingsList(
  entries: StandingsEntry[],
  options: RaceStandingsOptions = {},
): StandingsListItem[] {
  if (options.showAll) {
    return toSortedRows(entries).map((row) => ({ kind: "row" as const, row }));
  }

  const topN = options.topN ?? 10;
  const ahead = options.ahead ?? 1;
  const behind = options.behind ?? 1;

  const sorted = toSortedRows(entries);
  const top = sorted.filter((r) => r.position >= 1 && r.position <= topN);
  const items: StandingsListItem[] = top.map((row) => ({
    kind: "row" as const,
    row,
  }));

  const player = sorted.find((r) => r.isPlayer);
  if (!player) {
    return items;
  }

  if (player.position < 1) {
    if (items.length > 0) {
      items.push({ kind: "separator" });
    }
    items.push({ kind: "row", row: player });
    return items;
  }

  if (player.position <= topN) {
    return items;
  }

  const playerPos = player.position;
  const contextRows = sorted.filter(
    (r) =>
      r.position >= playerPos - ahead &&
      r.position <= playerPos + behind &&
      r.position > topN,
  );

  if (contextRows.length === 0) {
    return items;
  }

  items.push({ kind: "separator" });
  return [...items, ...buildListWithGaps(contextRows)];
}

/** Relatif (fallback classement) : N devant + pilote + N derrière. */
export function buildRelativeStandingsList(
  entries: StandingsEntry[],
  options: RelativeStandingsOptions = {},
): StandingsListItem[] {
  const ahead = options.ahead ?? 2;
  const behind = options.behind ?? 2;
  const sorted = toSortedRows(entries);
  const player = sorted.find((r) => r.isPlayer);
  if (!player) return [];

  if (player.position < 1) {
    return [{ kind: "row", row: player }];
  }

  const min = Math.max(1, player.position - ahead);
  const max = player.position + behind;
  const visible = sorted.filter(
    (r) => r.position >= min && r.position <= max,
  );
  return buildListWithGaps(visible);
}

export interface ClassStandingsGroup {
  classId: number;
  className: string;
  entries: StandingsEntry[];
}

/** Autres catégories (hors celle du joueur) : leaders uniquement. */
export function buildOtherClassStandings(
  entries: StandingsEntry[],
  leadersPerClass = 1,
): ClassStandingsGroup[] {
  const player = entries.find((e) => e.isPlayer);
  const playerClassId = player?.classId;
  const byClass = new Map<number, StandingsEntry[]>();

  for (const entry of entries) {
    const classId = entry.classId;
    if (classId == null || classId < 0) continue;
    if (playerClassId != null && classId === playerClassId) continue;
    const list = byClass.get(classId) ?? [];
    list.push(entry);
    byClass.set(classId, list);
  }

  const limit = Math.max(1, leadersPerClass);
  const groups: ClassStandingsGroup[] = [];
  for (const [classId, list] of byClass) {
    const sorted = [...list].sort(
      (a, b) =>
        (a.classPosition ?? a.position) - (b.classPosition ?? b.position),
    );
    const named = sorted[0]?.className?.trim() || `Classe ${classId}`;
    groups.push({
      classId,
      className: named,
      entries: sorted.slice(0, limit),
    });
  }

  groups.sort((a, b) => {
    const aSpeed = a.entries[0]?.classRelSpeed ?? 0;
    const bSpeed = b.entries[0]?.classRelSpeed ?? 0;
    if (bSpeed !== aSpeed) return bSpeed - aSpeed;
    return a.className.localeCompare(b.className, "fr");
  });
  return groups;
}
