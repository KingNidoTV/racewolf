import type { SessionData } from "@irsdk-node/types";
import type {
  GarageTelemetry,
  RacingTelemetry,
  TrackMapCar,
  TrackMapData,
  TrackMapPitGhost,
} from "../../src/types/telemetry";
import { resolveBrand, resolveCarColor } from "../../src/data/brands";
import {
  extractFlairIdsFromSessionYaml,
  resolveDriverNationalityFromDriver,
} from "../../src/utils/nationality";
import type { SectorStatus, StandingsEntry } from "../../src/types/telemetry";
import {
  garageSectorStatuses,
  standingsSectorBarStatuses,
} from "../../src/utils/garageSectorStatus";
import {
  resolveDriverFlags,
  resolveDriverStatus,
} from "../../src/utils/sessionFlags";
import { resolveTrackFlag } from "../../src/utils/trackFlags";
import {
  buildAthHud,
  buildStintLapSummary,
  buildTireWear,
  buildWeatherInfo,
} from "./athHud";
import {
  buildSessionBestLapByCarIdx,
  resolveSessionBestLapNum,
  resolveSessionBestLapSec,
} from "./sessionResults";
import { buildStrategyLive, buildStrategySession } from "./strategy";
import { iracingColorToHex } from "./iracingColor";
import {
  extractTireCompoundNamesFromYaml,
  mapTireCompound,
} from "./tireCompound";
import { isDriverConnected } from "./driverConnected";
import {
  isPlayerAwaitingRaceTiming,
  readPlayerRaceContext,
} from "./playerRaceContext";
import { isSetupGarageScreen, isActiveRacingSession } from "./viewModeSignals";
import { getSectorCount } from "./sectorConfig";
import { getSectorBoundaries } from "../../src/utils/sectorGeometry";
import { resolveSeriesTitle } from "./seriesTitle";
import { readBestLapSectorSecs } from "./sectorTelemetry";
import type { RacingLapRecord } from "../telemetry/RacingLapHistory";
import type { LiveSectorTiming } from "../telemetry/PlayerSectorTracker";
import type { StintRuntime } from "../telemetry/StintIndexTracker";
import {
  buildResolvedBestLapMap,
  findLeaderCarIdx,
  leaderBestFromMap,
} from "./standingsTimes";
import {
  computeTrackGapSeconds,
  formatGapSeconds,
  formatLapTime,
  formatRelativeTrackGap,
  formatSectorTime,
  msToLapTime,
  sessionTimeRemainLabel,
} from "./format";

type Telemetry = Record<string, unknown>;

interface DriverRow {
  CarIdx: number;
  UserName?: string;
  CarScreenName?: string;
  CarNumber?: string;
  CarClassID?: number;
  CarClassColor?: number;
  CarClassShortName?: string;
  CarClassRelSpeed?: number;
  LicString?: string;
  /** Drapeau profil iRacing (depuis 2025, remplace ClubName). */
  FlairId?: number;
  IsSpectator?: number;
  CarIsPaceCar?: number;
}

/** Pilotes présents dans la session (hors spectateurs et pace car). */
function isServerDriver(driver: DriverRow): boolean {
  const name = driver.UserName?.trim();
  if (!name) return false;
  if (driver.IsSpectator === 1) return false;
  return true;
}

function isPaceCar(driver: DriverRow, session: SessionData): boolean {
  if (driver.CarIsPaceCar === 1) return true;
  const paceIdx = session.DriverInfo?.PaceCarIdx ?? -1;
  return paceIdx >= 0 && driver.CarIdx === paceIdx;
}

function shouldIncludeInStandings(
  driver: DriverRow,
  session: SessionData,
): boolean {
  return isServerDriver(driver) && !isPaceCar(driver, session);
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function arr<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function getDrivers(session: SessionData): DriverRow[] {
  return (session.DriverInfo?.Drivers ?? []) as DriverRow[];
}

/** Complète FlairId depuis le YAML brut si le parseur ne l’expose pas. */
function getDriversWithFlair(
  session: SessionData,
  sessionYaml?: string,
): DriverRow[] {
  const drivers = getDrivers(session);
  const fromYaml = extractFlairIdsFromSessionYaml(sessionYaml);
  if (fromYaml.size === 0) return drivers;
  return drivers.map((driver) => {
    if (driver.FlairId && driver.FlairId > 0) return driver;
    const flairId = fromYaml.get(driver.CarIdx);
    return flairId ? { ...driver, FlairId: flairId } : driver;
  });
}

function driverByIdx(drivers: DriverRow[], carIdx: number): DriverRow | undefined {
  return drivers.find((d) => d.CarIdx === carIdx);
}

function sessionTypeLabel(session: SessionData, sessionNum: number): string {
  const sessions = session.SessionInfo?.Sessions ?? [];
  const current = sessions.find((s) => s.SessionNum === sessionNum);
  return current?.SessionType ?? current?.SessionName ?? "Session";
}

function sectorTimeFromRaw(value: number): string {
  return formatSectorTime(value >= 0 ? value : null);
}

function sessionBestSectorSecs(
  telemetry: Telemetry,
  sectorCount: number,
): number[] {
  return readBestLapSectorSecs(telemetry, sectorCount);
}

function shouldInvertLapDistPct(session: SessionData): boolean {
  const dir = (session.WeekendInfo?.TrackDirection ?? "").toLowerCase();
  if (dir.includes("counter") || dir.includes("reverse")) return true;
  if (dir.includes("clock")) return false;
  // Défaut : espace iRacing brut (aligné SplitTimeInfo / secteurs).
  return false;
}

function displayLapDistPct(pct: number, session: SessionData): number {
  const t = shouldInvertLapDistPct(session) ? 1 - pct : pct;
  return Math.min(1, Math.max(0, t));
}

interface StandingsContext {
  arrays: StandingsArrays;
  resolvedBest: Map<number, number>;
  leaderIdx: number;
  leaderBest: number;
  refLapSec: number;
  session: SessionData;
  sessionNum: number;
  stintLapsByCar?: Map<number, number>;
  /** Pilote sans position ni chrono — reste au classement / relatif. */
  playerAwaitingTiming: boolean;
  telemetry: Telemetry;
  playerIdx: number;
  includeSectors: boolean;
  sectorCount: number;
  sessionSectorBest: number[];
  opponentSectors?: Map<number, number[]>;
  sessionBestLapSec: number;
  liveSectorStatuses?: Map<number, SectorStatus[]>;
  /** Libellés composés iRacing (index = CarIdxTireCompound). */
  tireCompoundNames: string[];
}

function computeSessionBestLapSec(
  arrays: StandingsArrays,
  resolvedBest: Map<number, number>,
): number {
  let min = -1;
  for (let idx = 0; idx < arrays.bestTimes.length; idx++) {
    const best = resolvedBest.get(idx) ?? arrays.bestTimes[idx] ?? -1;
    if (best > 0 && (min < 0 || best < min)) {
      min = best;
    }
  }
  return min;
}

function resolveStintLaps(idx: number, ctx: StandingsContext): number {
  const tracked = ctx.stintLapsByCar?.get(idx);
  if (tracked != null) return Math.max(0, tracked);
  return Math.max(0, ctx.arrays.stintLaps[idx] ?? 0);
}

function isPracticeOrQualifyingSession(sessionType: string): boolean {
  const s = sessionType.toLowerCase();
  if (/\brace\b/.test(s)) return false;
  return (
    s.includes("practice") ||
    s.includes("pratique") ||
    s.includes("essai") ||
    s.includes("qualif") ||
    s.includes("test") ||
    s.includes("time trial")
  );
}

function isRaceSessionLabel(sessionType: string): boolean {
  const s = sessionType.toLowerCase();
  if (isPracticeOrQualifyingSession(sessionType)) return false;
  return /\brace\b/.test(s) || s.includes("course");
}

/** Grille de départ : ResultsPositions course, sinon qualifs précédentes. */
function buildGridPositionMap(
  session: SessionData,
  sessionNum: number,
): Map<number, { position: number; classPosition: number }> {
  const map = new Map<number, { position: number; classPosition: number }>();
  const sessions = session.SessionInfo?.Sessions ?? [];

  const apply = (
    rows: { Position: number; ClassPosition: number; CarIdx: number }[] | undefined,
  ) => {
    for (const row of rows ?? []) {
      if (row.Position > 0 && !map.has(row.CarIdx)) {
        map.set(row.CarIdx, {
          position: row.Position,
          classPosition:
            row.ClassPosition > 0 ? row.ClassPosition : row.Position,
        });
      }
    }
  };

  const current = sessions.find((s) => s.SessionNum === sessionNum);
  apply(current?.ResultsPositions);

  if (map.size > 0) return map;

  const prior = [...sessions]
    .filter((s) => s.SessionNum < sessionNum)
    .sort((a, b) => b.SessionNum - a.SessionNum);

  const isQualy = (s: (typeof prior)[number]) => {
    const label = `${s.SessionType ?? ""} ${s.SessionName ?? ""}`.toLowerCase();
    return (
      label.includes("qualif") ||
      label.includes("heat") ||
      label.includes("warmup")
    );
  };

  for (const s of prior.filter(isQualy)) {
    apply(s.ResultsPositions);
    if (map.size > 0) return map;
  }

  for (const s of prior) {
    if ((s.ResultsPositions?.length ?? 0) > 0) {
      apply(s.ResultsPositions);
      if (map.size > 0) return map;
    }
  }

  return map;
}

function isPreRaceGridSession(
  telemetry: Telemetry,
  sessionType: string,
): boolean {
  return isRaceSessionLabel(sessionType) && !isActiveRacingSession(telemetry);
}

function formatLiveRaceGap(
  idx: number,
  leaderIdx: number,
  arrays: StandingsArrays,
  refLapSec: number,
): string {
  if (leaderIdx < 0) return "—";
  const f2 = arrays.f2Times[idx] ?? -1;
  if (f2 > 0 && f2 < 99999) {
    return formatRelativeTrackGap(f2);
  }
  return formatRelativeTrackGap(
    computeTrackGapSeconds(
      arrays.lapDistPct[leaderIdx] ?? 0,
      arrays.lapDistPct[idx] ?? 0,
      arrays.estTime[leaderIdx] ?? 0,
      arrays.estTime[idx] ?? 0,
      refLapSec,
    ),
  );
}

function buildStandingsContext(
  telemetry: Telemetry,
  session: SessionData,
  useClassPos: boolean,
  stintLapsByCar?: Map<number, number>,
  opponentSectors?: Map<number, number[]>,
  sessionSectorBestOverride?: number[],
  liveSectorStatuses?: Map<number, SectorStatus[]>,
  tireCompoundNames: string[] = [],
): StandingsContext {
  const sessionNum = num(telemetry.SessionNum, 0);
  const sessionType = sessionTypeLabel(session, sessionNum);
  const sectorCount = getSectorCount(session);
  const includeSectors = isPracticeOrQualifyingSession(sessionType);
  const sessionSectorBest = includeSectors
    ? mergeSessionSectorBests(
        sessionBestSectorSecs(telemetry, sectorCount),
        padSectorArray(sessionSectorBestOverride ?? [], sectorCount),
      )
    : [];
  const arrays = readStandingsArrays(telemetry);
  const playerIdx = num(telemetry.PlayerCarIdx, 0);
  const lastLaps = arr<number>(telemetry.CarIdxLastLapTime);
  const resolvedBest = buildResolvedBestLapMap(
    telemetry,
    session,
    arrays.bestTimes,
    lastLaps,
  );
  const leaderIdx = findLeaderCarIdx(
    arrays.positions,
    arrays.classPositions,
    useClassPos,
  );
  const leaderBest = leaderBestFromMap(leaderIdx, resolvedBest);
  const refLapSec =
    num(telemetry.LapLastLapTime, 0) ||
    resolvedBest.get(playerIdx) ||
    leaderBest ||
    90;

  const playerCtx = readPlayerRaceContext(telemetry);
  const sessionBestLapSec = computeSessionBestLapSec(arrays, resolvedBest);
  const playerRacePos = useClassPos
    ? arrays.classPositions[playerIdx] ?? 0
    : arrays.positions[playerIdx] ?? 0;

  return {
    arrays,
    resolvedBest,
    leaderIdx,
    leaderBest,
    refLapSec,
    session,
    sessionNum,
    stintLapsByCar,
    playerAwaitingTiming: isPlayerAwaitingRaceTiming(
      telemetry,
      session,
      resolvedBest,
      arrays.bestTimes,
      arrays.lapDistPct,
      playerIdx,
      playerRacePos,
    ),
    telemetry,
    playerIdx,
    includeSectors,
    sectorCount,
    sessionSectorBest,
    opponentSectors,
    sessionBestLapSec,
    liveSectorStatuses,
    tireCompoundNames,
  };
}

/** SDK pour le pilote, estimation LapDistPct pour les autres. */
function readBestLapSectorRaw(
  telemetry: Telemetry,
  carIdx: number,
  playerIdx: number,
  sectorCount: number,
  opponentSectors?: Map<number, number[]>,
  playerBestSectors?: number[],
): number[] {
  if (carIdx === playerIdx) {
    const sdk = readBestLapSectorSecs(telemetry, sectorCount);
    const tracked = padSectorArray(playerBestSectors ?? [], sectorCount);
    return Array.from({ length: sectorCount }, (_, i) => {
      const s = sdk[i] ?? -1;
      if (s >= 0) return s;
      return tracked[i] ?? -1;
    });
  }

  const tracked = opponentSectors?.get(carIdx);
  if (tracked) return padSectorArray(tracked, sectorCount);
  return Array.from({ length: sectorCount }, () => -1);
}

function padSectorArray(sectors: number[], sectorCount: number): number[] {
  return Array.from({ length: sectorCount }, (_, i) => sectors[i] ?? -1);
}

function mergeSessionSectorBests(
  playerBest: number[],
  trackedBest: number[],
): number[] {
  const len = Math.max(playerBest.length, trackedBest.length);
  const out = padSectorArray(playerBest, len);
  for (let i = 0; i < trackedBest.length; i++) {
    const t = trackedBest[i];
    if (t > 0 && (out[i] < 0 || t < out[i])) out[i] = t;
  }
  return out;
}

function readBestLapSectorTimes(raw: number[]): string[] {
  return raw.map((value) => sectorTimeFromRaw(value));
}

interface StandingsArrays {
  positions: number[];
  classPositions: number[];
  carNumbers: string[];
  bestTimes: number[];
  tireCompounds: number[];
  stintLaps: number[];
  onPitRoad: boolean[];
  sessionFlags: number[];
  estTime: number[];
  lapDistPct: number[];
  lastLapTimes: number[];
  f2Times: number[];
}

function readStandingsArrays(telemetry: Telemetry): StandingsArrays {
  return {
    positions: arr<number>(telemetry.CarIdxPosition),
    classPositions: arr<number>(telemetry.CarIdxClassPosition),
    carNumbers: arr<string>(telemetry.CarIdxCarNumber),
    bestTimes: arr<number>(telemetry.CarIdxBestLapTime),
    tireCompounds: arr<number>(telemetry.CarIdxTireCompound),
    stintLaps: arr<number>(telemetry.CarIdxStintLaps),
    onPitRoad: arr<boolean>(telemetry.CarIdxOnPitRoad),
    sessionFlags: arr<number>(telemetry.CarIdxSessionFlags),
    estTime: arr<number>(telemetry.CarIdxEstTime),
    lapDistPct: arr<number>(telemetry.CarIdxLapDistPct),
    lastLapTimes: arr<number>(telemetry.CarIdxLastLapTime),
    f2Times: arr<number>(telemetry.CarIdxF2Time),
  };
}

function formatGapToLeader(
  pos: number,
  idx: number,
  ctx: StandingsContext,
): string {
  if (pos <= 1) return "—";

  const { arrays, resolvedBest, leaderIdx, leaderBest, refLapSec, session, sessionNum } =
    ctx;
  const sessionType = sessionTypeLabel(session, sessionNum);

  if (isRaceSessionLabel(sessionType)) {
    return formatLiveRaceGap(idx, leaderIdx, arrays, refLapSec);
  }

  const best = resolvedBest.get(idx) ?? arrays.bestTimes[idx] ?? -1;
  if (leaderBest > 0 && best > 0) {
    return formatGapSeconds(Math.max(0, best - leaderBest));
  }

  if (leaderIdx >= 0) {
    return formatLiveRaceGap(idx, leaderIdx, arrays, refLapSec);
  }

  return "—";
}

function formatGapToPlayer(
  arrays: StandingsArrays,
  idx: number,
  playerIdx: number,
  refLapSec: number,
): string {
  const gapSec = computeTrackGapSeconds(
    arrays.lapDistPct[playerIdx] ?? 0,
    arrays.lapDistPct[idx] ?? 0,
    arrays.estTime[playerIdx] ?? 0,
    arrays.estTime[idx] ?? 0,
    refLapSec,
  );
  return formatRelativeTrackGap(gapSec);
}

function buildStandingsEntry(
  idx: number,
  arrays: StandingsArrays,
  drivers: DriverRow[],
  playerIdx: number,
  useClassPos: boolean,
  ctx: StandingsContext,
  gapOverride?: string,
  positionOverride?: number,
): StandingsEntry | null {
  const isPlayer = idx === playerIdx;
  let pos =
    positionOverride ??
    (useClassPos ? arrays.classPositions[idx] : arrays.positions[idx]);
  const onPit = Boolean(arrays.onPitRoad[idx]);
  const playerUnrankedGrace =
    isPlayer && ctx.playerAwaitingTiming && (!pos || pos < 1);
  const driver = driverByIdx(drivers, idx);
  const connectedUnranked =
    Boolean(driver && shouldIncludeInStandings(driver, ctx.session)) &&
    (!pos || pos < 1);

  if ((!pos || pos < 1) && !playerUnrankedGrace && !connectedUnranked) {
    return null;
  }
  if (playerUnrankedGrace || connectedUnranked) pos = 0;

  const carScreen = driver?.CarScreenName ?? "—";
  const carNumber = String(
    driver?.CarNumber ?? arrays.carNumbers[idx] ?? idx,
  ).trim();
  const brand = resolveBrand(carScreen);
  const best = ctx.resolvedBest.get(idx) ?? arrays.bestTimes[idx] ?? -1;
  const last = arrays.lastLapTimes[idx] ?? -1;

  const flags = arrays.sessionFlags[idx] ?? 0;
  const driverFlags = resolveDriverFlags(flags, onPit);
  const inPits = driverFlags.inPits;

  return {
    position: pos,
    carNumber,
    name: driver?.UserName ?? `Car ${idx}`,
    carBrand: carScreen,
    carColor: resolveCarColor(
      carNumber,
      carScreen,
      brand?.color ?? iracingColorToHex(driver?.CarClassColor ?? 0),
    ),
      nationality: resolveDriverNationalityFromDriver(
        driver as unknown as Record<string, unknown>,
        { isPlayer: idx === playerIdx },
      ),
    bestTime: pos > 0 ? formatLapTime(best) : "—",
    lastLap: formatLapTime(last),
    gap: gapOverride ?? (pos > 0 ? formatGapToLeader(pos, idx, ctx) : "—"),
    tireCompound: mapTireCompound(arrays.tireCompounds[idx] ?? 0, {
      compoundNames: ctx.tireCompoundNames,
    }),
    stintLaps: resolveStintLaps(idx, ctx),
    inPits,
    hasPenalty: driverFlags.hasPenalty,
    hasDamage: driverFlags.hasDamage,
    status: resolveDriverStatus(flags, onPit),
    isPlayer,
    isSessionFastest:
      best > 0 &&
      ctx.sessionBestLapSec > 0 &&
      Math.abs(best - ctx.sessionBestLapSec) < 0.0005,
    isConnected:
      playerUnrankedGrace ||
      connectedUnranked ||
      isDriverConnected(
        ctx.session,
        ctx.sessionNum,
        idx,
        pos > 0 ? pos : 1,
        driver,
        arrays.lapDistPct[idx] ?? -1,
      ),
    classId: driver?.CarClassID,
    className: driver?.CarClassShortName?.trim() || undefined,
    classPosition: arrays.classPositions[idx] ?? 0,
    classRelSpeed: driver?.CarClassRelSpeed,
    ...(ctx.includeSectors
      ? (() => {
          const sectorRaw = readBestLapSectorRaw(
            ctx.telemetry,
            idx,
            ctx.playerIdx,
            ctx.sectorCount,
            ctx.opponentSectors,
          );
          return {
            bestLapSectorTimes: readBestLapSectorTimes(sectorRaw),
            bestLapSectorStatus: ctx.liveSectorStatuses
              ? (ctx.liveSectorStatuses.get(idx) ??
                Array.from({ length: ctx.sectorCount }, () => "pending" as const))
              : standingsSectorBarStatuses(sectorRaw, ctx.sessionSectorBest),
          };
        })()
      : {}),
  };
}

function buildAllStandings(
  telemetry: Telemetry,
  session: SessionData,
  drivers: DriverRow[],
  playerIdx: number,
  useClassPos: boolean,
  stintLapsByCar?: Map<number, number>,
  opponentSectors?: Map<number, number[]>,
  sessionSectorBestOverride?: number[],
  liveSectorStatuses?: Map<number, SectorStatus[]>,
  tireCompoundNames: string[] = [],
): StandingsEntry[] {
  const ctx = buildStandingsContext(
    telemetry,
    session,
    useClassPos,
    stintLapsByCar,
    opponentSectors,
    sessionSectorBestOverride,
    liveSectorStatuses,
    tireCompoundNames,
  );
  const sessionType = sessionTypeLabel(session, ctx.sessionNum);
  const preRaceGrid = isPreRaceGridSession(telemetry, sessionType);
  const gridPositions = preRaceGrid
    ? buildGridPositionMap(session, ctx.sessionNum)
    : null;

  const entries: StandingsEntry[] = [];
  const seen = new Set<number>();

  const carCount = Math.max(
    ctx.arrays.positions.length,
    ...drivers.map((d) => d.CarIdx + 1),
    0,
  );

  for (let idx = 0; idx < carCount; idx++) {
    const driver = driverByIdx(drivers, idx);
    if (driver && !shouldIncludeInStandings(driver, session)) continue;

    let positionOverride: number | undefined;
    if (preRaceGrid) {
      const grid = gridPositions?.get(idx);
      if (grid) {
        positionOverride = useClassPos ? grid.classPosition : grid.position;
      }
    }

    const row = buildStandingsEntry(
      idx,
      ctx.arrays,
      drivers,
      playerIdx,
      useClassPos,
      ctx,
      preRaceGrid ? "—" : undefined,
      positionOverride,
    );
    if (row) {
      entries.push(row);
      seen.add(idx);
    }
  }

  // Grille : inclure les voitures présentes dans ResultsPositions même sans télémétrie.
  if (preRaceGrid && gridPositions) {
    for (const [idx, grid] of gridPositions) {
      if (seen.has(idx)) continue;
      const driver = driverByIdx(drivers, idx);
      if (!driver || !shouldIncludeInStandings(driver, session)) continue;
      const row = buildStandingsEntry(
        idx,
        ctx.arrays,
        drivers,
        playerIdx,
        useClassPos,
        ctx,
        "—",
        useClassPos ? grid.classPosition : grid.position,
      );
      if (row) entries.push(row);
    }
  }

  entries.sort((a, b) => {
    const ap = a.position > 0 ? a.position : Number.MAX_SAFE_INTEGER;
    const bp = b.position > 0 ? b.position : Number.MAX_SAFE_INTEGER;
    return ap - bp;
  });
  return entries;
}

/** Relatif : ordre sur la piste autour du pilote, pas le classement course. */
function buildRelative(
  telemetry: Telemetry,
  session: SessionData,
  drivers: DriverRow[],
  playerIdx: number,
  useClassPos: boolean,
  stintLapsByCar?: Map<number, number>,
  opponentSectors?: Map<number, number[]>,
  sessionSectorBestOverride?: number[],
  liveSectorStatuses?: Map<number, SectorStatus[]>,
  relativeAhead = 2,
  relativeBehind = 2,
  tireCompoundNames: string[] = [],
): StandingsEntry[] {
  const ctx = buildStandingsContext(
    telemetry,
    session,
    useClassPos,
    stintLapsByCar,
    opponentSectors,
    sessionSectorBestOverride,
    liveSectorStatuses,
    tireCompoundNames,
  );
  const { arrays } = ctx;
  const ranked: { idx: number; gapSec: number }[] = [];

  const isOnTrackRelative = (idx: number): boolean => {
    if (idx === playerIdx) return true;
    // Stands / pit lane : hors relatif.
    if (Boolean(arrays.onPitRoad[idx])) return false;
    const pct = arrays.lapDistPct[idx];
    // iRacing : LapDistPct < 0 = déconnecté / absent de la piste.
    if (!Number.isFinite(pct) || pct < 0) return false;
    const driver = driverByIdx(drivers, idx);
    if (!driver || !shouldIncludeInStandings(driver, session)) return false;
    const pos = useClassPos
      ? arrays.classPositions[idx]
      : arrays.positions[idx];
    const sessions = session.SessionInfo?.Sessions ?? [];
    const current = sessions.find((s) => s.SessionNum === ctx.sessionNum);
    const result = current?.ResultsPositions?.find((p) => p.CarIdx === idx);
    if (result?.ReasonOutId && result.ReasonOutId > 0) return false;
    // Sans position : uniquement s'il est bien sur la piste (pct valide).
    if ((!pos || pos < 1) && (pct < 0 || pct > 1.05)) return false;
    return true;
  };

  const carCount = Math.max(
    arrays.lapDistPct.length,
    ...drivers.map((driver) => driver.CarIdx + 1),
  );
  for (let idx = 0; idx < carCount; idx++) {
    const pos = useClassPos
      ? arrays.classPositions[idx]
      : arrays.positions[idx];
    const driver = driverByIdx(drivers, idx);
    if (!driver || !shouldIncludeInStandings(driver, session)) continue;
    if (!isOnTrackRelative(idx)) continue;
    const allowUnrankedPlayer =
      idx === playerIdx && ctx.playerAwaitingTiming && (!pos || pos < 1);

    const pct = arrays.lapDistPct[idx];
    if (idx !== playerIdx && (!Number.isFinite(pct) || pct < 0)) continue;
    const allowConnectedUnranked =
      idx !== playerIdx &&
      (!pos || pos < 1) &&
      Number.isFinite(pct) &&
      pct >= 0;
    if (
      (!pos || pos < 1) &&
      !allowUnrankedPlayer &&
      !allowConnectedUnranked
    ) {
      continue;
    }

    const gapSec =
      idx === playerIdx
        ? 0
        : computeTrackGapSeconds(
            arrays.lapDistPct[playerIdx] ?? 0,
            Number.isFinite(pct) && pct >= 0 ? pct : 0,
            arrays.estTime[playerIdx] ?? 0,
            arrays.estTime[idx] ?? 0,
            ctx.refLapSec,
          );
    ranked.push({ idx, gapSec });
  }

  const playerAwaitingOnly =
    ranked.length === 0 && ctx.playerAwaitingTiming;
  if (playerAwaitingOnly) {
    const row = buildStandingsEntry(
      playerIdx,
      arrays,
      drivers,
      playerIdx,
      useClassPos,
      ctx,
      "—",
      0,
    );
    return row ? [row] : [];
  }

  if (ranked.length === 0) return [];

  /** Devant en haut (+), pilote au centre, derrière en bas (−). */
  ranked.sort((a, b) => b.gapSec - a.gapSec);
  let playerRank = ranked.findIndex((r) => r.idx === playerIdx);
  if (playerRank < 0 && ctx.playerAwaitingTiming) {
    ranked.push({ idx: playerIdx, gapSec: 0 });
    ranked.sort((a, b) => b.gapSec - a.gapSec);
    playerRank = ranked.findIndex((r) => r.idx === playerIdx);
  }
  if (playerRank < 0) return [];

  const entries: StandingsEntry[] = [];
  for (let i = 0; i < ranked.length; i++) {
    if (i < playerRank - relativeAhead) continue;
    if (i > playerRank + relativeBehind) continue;
    const { idx, gapSec } = ranked[i];
    const gapOverride =
      idx === playerIdx ? "—" : formatRelativeTrackGap(gapSec);

    const row = buildStandingsEntry(
      idx,
      arrays,
      drivers,
      playerIdx,
      useClassPos,
      ctx,
      gapOverride,
    );
    if (!row) continue;
    // Sécurité : jamais les stands / déconnectés (hors joueur).
    if (
      !row.isPlayer &&
      (row.inPits || row.status === "box" || row.isConnected === false)
    ) {
      continue;
    }
    entries.push(row);
  }

  return entries;
}

function buildGarageRows(
  telemetry: Telemetry,
  session: SessionData,
  drivers: DriverRow[],
  playerIdx: number,
  opponentSectors?: Map<number, number[]>,
  sessionSectorBestOverride?: number[],
  stintLapsByCar?: Map<number, number>,
  tireCompoundNames: string[] = [],
  playerBestSectors?: number[],
): { rows: GarageTelemetry["rows"]; isStartingGrid: boolean } {
  const sessionNum = num(telemetry.SessionNum, 0);
  const sessionType = sessionTypeLabel(session, sessionNum);
  const raceSession = isRaceSessionLabel(sessionType);
  const liveRace = raceSession && isActiveRacingSession(telemetry);
  const preRaceGrid = raceSession && !liveRace;
  const gridPositions = preRaceGrid
    ? buildGridPositionMap(session, sessionNum)
    : null;

  const sessionBests = buildSessionBestLapByCarIdx(session, sessionNum);
  const positions = arr<number>(telemetry.CarIdxPosition);
  const classPositions = arr<number>(telemetry.CarIdxClassPosition);
  const bestTimes = arr<number>(telemetry.CarIdxBestLapTime);
  const lastLapTimes = arr<number>(telemetry.CarIdxLastLapTime);
  const laps = arr<number>(telemetry.CarIdxLap);
  const bestLapNums = arr<number>(telemetry.CarIdxBestLapNum);
  const carNumbers = arr<string>(telemetry.CarIdxCarNumber);
  const tireCompounds = arr<number>(telemetry.CarIdxTireCompound);
  const onPitRoad = arr<boolean>(telemetry.CarIdxOnPitRoad);
  const estTime = arr<number>(telemetry.CarIdxEstTime);
  const lapDistPct = arr<number>(telemetry.CarIdxLapDistPct);
  const f2Times = arr<number>(telemetry.CarIdxF2Time);
  const sectorCount = getSectorCount(session);
  const sessionSectorBest = mergeSessionSectorBests(
    sessionBestSectorSecs(telemetry, sectorCount),
    padSectorArray(sessionSectorBestOverride ?? [], sectorCount),
  );

  const resolvedBestByIdx = new Map<number, number>();
  for (const driver of drivers) {
    if (!shouldIncludeInStandings(driver, session)) continue;
    const idx = driver.CarIdx;
    const resolved = resolveSessionBestLapSec(
      idx,
      bestTimes[idx] ?? -1,
      sessionBests,
      lastLapTimes[idx] ?? -1,
    );
    if (resolved > 0) resolvedBestByIdx.set(idx, resolved);
  }

  const leaderIdx = findLeaderCarIdx(positions, classPositions, false);
  const leaderBest =
    leaderIdx >= 0
      ? (resolvedBestByIdx.get(leaderIdx) ?? bestTimes[leaderIdx] ?? -1)
      : -1;
  const sessionFastest =
    [...resolvedBestByIdx.values()].reduce<number>((min, t) => {
      if (t > 0 && (min < 0 || t < min)) return t;
      return min;
    }, -1) ?? -1;
  const refLapSec =
    num(telemetry.LapLastLapTime, 0) ||
    resolvedBestByIdx.get(playerIdx) ||
    leaderBest ||
    sessionFastest ||
    90;

  const rows: GarageTelemetry["rows"] = [];

  for (const driver of drivers) {
    if (!shouldIncludeInStandings(driver, session)) continue;

    const idx = driver.CarIdx;
    let racePos = positions[idx] ?? 0;
    let classPos = classPositions[idx] ?? 0;

    if (preRaceGrid) {
      const grid = gridPositions?.get(idx);
      if (grid) {
        racePos = grid.position;
        classPos = grid.classPosition;
      }
    }

    if (idx === playerIdx && isSetupGarageScreen(telemetry) && racePos < 1) {
      continue;
    }
    const best =
      resolvedBestByIdx.get(idx) ??
      resolveSessionBestLapSec(
        idx,
        bestTimes[idx] ?? -1,
        sessionBests,
        lastLapTimes[idx] ?? -1,
      );
    const carScreen = driver.CarScreenName ?? "—";
    const brand = resolveBrand(carScreen);

    let gapLabel = "—";
    if (preRaceGrid) {
      gapLabel = "—";
    } else if (liveRace && racePos > 1 && leaderIdx >= 0) {
      gapLabel = formatLiveRaceGap(
        idx,
        leaderIdx,
        {
          positions,
          classPositions,
          carNumbers,
          bestTimes,
          tireCompounds,
          stintLaps: arr<number>(telemetry.CarIdxStintLaps),
          onPitRoad,
          sessionFlags: arr<number>(telemetry.CarIdxSessionFlags),
          estTime,
          lapDistPct,
          lastLapTimes,
          f2Times,
        },
        refLapSec,
      );
    } else if (!liveRace) {
      const gapSec =
        leaderBest > 0 && best > 0 ? Math.max(0, best - leaderBest) : 0;
      gapLabel = gapSec > 0 ? formatGapSeconds(gapSec) : "—";
    }

    const sectorRaw = readBestLapSectorRaw(
      telemetry,
      idx,
      playerIdx,
      sectorCount,
      opponentSectors,
      playerBestSectors,
    );

    const carNumber = String(
      driver.CarNumber ?? carNumbers[idx] ?? idx,
    ).trim();

    rows.push({
      position: racePos > 0 ? racePos : 0,
      carNumber,
      carBrand: carScreen,
      carColor: resolveCarColor(
        carNumber,
        carScreen,
        brand?.color ?? iracingColorToHex(driver.CarClassColor ?? 0),
      ),
      nationality: resolveDriverNationalityFromDriver(
        driver as unknown as Record<string, unknown>,
        { isPlayer: idx === playerIdx },
      ),
      isPlayer: idx === playerIdx,
      driverName: driver.UserName ?? `Car ${idx}`,
      bestTime: best > 0 ? formatLapTime(best) : "—",
      gap: gapLabel,
      bestLapSectorTimes: readBestLapSectorTimes(sectorRaw),
      bestLapSectorStatus: garageSectorStatuses(
        sectorRaw,
        sessionSectorBest,
      ),
      lapsCompleted: laps[idx] ?? 0,
      lapsLastStint: Math.max(0, stintLapsByCar?.get(idx) ?? 0),
      bestLapNumber: resolveSessionBestLapNum(
        idx,
        bestLapNums[idx] ?? 0,
        sessionBests,
        best,
      ),
      tireCompound: mapTireCompound(tireCompounds[idx] ?? 0, {
        compoundNames: tireCompoundNames,
      }),
      status: onPitRoad[idx] ? "box" : null,
      classId: driver.CarClassID,
      className: driver.CarClassShortName?.trim() || undefined,
      classPosition: classPos > 0 ? classPos : 0,
      classRelSpeed: driver.CarClassRelSpeed,
    });
  }

  rows.sort((a, b) => {
    const ap = a.position > 0 ? a.position : 9999;
    const bp = b.position > 0 ? b.position : 9999;
    if (ap !== bp) return ap - bp;
    return a.carNumber.localeCompare(b.carNumber, undefined, {
      numeric: true,
    });
  });

  return { rows, isStartingGrid: preRaceGrid };
}

function trackSlug(trackName: string, trackId: number): string {
  const slug = trackName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `track-${trackId}`;
}

function buildTrackMap(
  telemetry: Telemetry,
  session: SessionData,
  drivers: DriverRow[],
  playerIdx: number,
  useClassPos: boolean,
  pitDurationSec: number,
): TrackMapData {
  const arrays = readStandingsArrays(telemetry);
  const weekend = session.WeekendInfo;
  const trackName = weekend?.TrackDisplayName ?? weekend?.TrackName ?? "—";
  const trackId = num(weekend?.TrackID, 0);
  const cars: TrackMapCar[] = [];

  const carCount = Math.max(
    arrays.positions.length,
    arrays.lapDistPct.length,
    ...drivers.map((driver) => driver.CarIdx + 1),
  );

  for (let idx = 0; idx < carCount; idx++) {
    const driver = driverByIdx(drivers, idx);
    if (!driver || !shouldIncludeInStandings(driver, session)) continue;

    const pos = useClassPos
      ? arrays.classPositions[idx]
      : arrays.positions[idx];

    const classPos = arrays.classPositions[idx] ?? 0;
    const overallPos = arrays.positions[idx] ?? 0;
    // Leader de catégorie (multi-class) ou leader absolu si pas de class pos.
    const isClassLeader =
      classPos === 1 || (classPos <= 0 && overallPos === 1);

    const lapPct = arrays.lapDistPct[idx] ?? -1;
    // Un nouvel arrivant n'a pas encore de position/chrono, mais iRacing
    // fournit généralement déjà LapDistPct. À défaut, l'afficher à la ligne.
    const visibleLapPct =
      Number.isFinite(lapPct) && lapPct >= 0 && lapPct <= 1 ? lapPct : 0;
    const carScreen = driver?.CarScreenName ?? "—";
    const brand = resolveBrand(carScreen);

    const carNumber = String(
      driver?.CarNumber ?? arrays.carNumbers[idx] ?? idx,
    ).trim();

    cars.push({
      carIdx: idx,
      position: pos && pos > 0 ? pos : Number.MAX_SAFE_INTEGER,
      carNumber,
      lapDistPct: displayLapDistPct(visibleLapPct, session),
      carColor: resolveCarColor(
        carNumber,
        carScreen,
        brand?.color ?? iracingColorToHex(driver?.CarClassColor ?? 0),
      ),
      isPlayer: idx === playerIdx,
      onPit: Boolean(arrays.onPitRoad[idx]),
      isClassLeader,
      classId: driver?.CarClassID,
      classRelSpeed: driver?.CarClassRelSpeed,
    });
  }

  cars.sort((a, b) => a.position - b.position);

  const playerPct = arrays.lapDistPct[playerIdx] ?? -1;
  const referenceLapSec =
    num(telemetry.LapLastLapTime, -1) > 0
      ? num(telemetry.LapLastLapTime, 0)
      : num(telemetry.LapBestLapTime, 90);
  const pitLossPct =
    pitDurationSec > 0 && referenceLapSec > 0
      ? pitDurationSec / referenceLapSec
      : 0;
  // Fantôme : position qu'aurait le joueur après le temps moyen passé aux pits.
  // Le modulo gère un temps pit supérieur au reste du tour.
  const pitPct =
    playerPct >= 0 && playerPct <= 1
      ? (playerPct + pitLossPct) % 1
      : -1;

  const pitGhost: TrackMapPitGhost | null =
    pitPct >= 0 && pitPct <= 1
      ? {
          lapDistPct: displayLapDistPct(pitPct, session),
          active: true,
        }
      : null;

  const sectorStartPctsGame = getSectorBoundaries(session);
  const sectorStartPcts = sectorStartPctsGame.map((pct) =>
    displayLapDistPct(pct, session),
  );

  return {
    trackId,
    trackSlug: trackSlug(trackName, trackId),
    trackName,
    startFinishPct: displayLapDistPct(0, session),
    sectorStartPcts:
      sectorStartPcts.length > 0 ? sectorStartPcts : [0, 1 / 3, 2 / 3],
    sectorStartPctsGame:
      sectorStartPctsGame.length > 0
        ? sectorStartPctsGame
        : [0, 1 / 3, 2 / 3],
    playerLapDistPctGame:
      playerPct >= 0 && playerPct <= 1.02 ? playerPct : undefined,
    cars,
    pitGhost,
  };
}

export function mapRacingTelemetry(
  telemetry: Telemetry,
  session: SessionData,
  stint: StintRuntime,
  recentLaps: RacingLapRecord[] = [],
  liveSectors: LiveSectorTiming = {
    sectorTimes: ["—", "—", "—"],
    sectorStatus: ["slower", "slower", "slower"],
  },
  pitDurationSec = 93,
  pitTimeEstimated = true,
  sessionYaml?: string,
  stintLapsByCar?: Map<number, number>,
  opponentSectors?: Map<number, number[]>,
  sessionSectorBestTracked?: number[],
  liveSectorStatuses?: Map<number, SectorStatus[]>,
  relativeAhead = 2,
  relativeBehind = 2,
  fuelLapsRemaining: number | null = null,
): RacingTelemetry {
  const drivers = getDriversWithFlair(session, sessionYaml);
  const playerIdx = num(telemetry.PlayerCarIdx, 0);
  const sessionNum = num(telemetry.SessionNum, 0);
  const weekend = session.WeekendInfo;

  const lap = num(telemetry.Lap, 0);
  const lapsTotal = num(telemetry.SessionLapsTotal, -1);
  const bestLap = num(telemetry.LapBestLapTime, -1);
  const lastLap = num(telemetry.LapLastLapTime, -1);
  const sectorCount = getSectorCount(session);
  const timeRemain = num(telemetry.SessionTimeRemain, -1);
  const timeTotal = num(telemetry.SessionTimeTotal, -1);
  const series = resolveSeriesTitle(weekend, sessionYaml);
  const track = weekend?.TrackDisplayName ?? weekend?.TrackName ?? "—";
  const tireCompoundNames = extractTireCompoundNamesFromYaml(sessionYaml);
  const sessionType = sessionTypeLabel(session, sessionNum);
  const isStartingGrid = isPreRaceGridSession(telemetry, sessionType);
  const sessionProgress =
    timeRemain >= 0 && timeTotal > 0
      ? Math.min(1, Math.max(0, 1 - timeRemain / timeTotal))
      : lapsTotal > 0
        ? lap / lapsTotal
        : 0;

  return {
    session: {
      series,
      track,
      sessionType,
      raceTitle: `${series} — ${track}`,
      timeRemaining: sessionTimeRemainLabel(timeRemain),
      sessionProgress,
      lap,
      lapsTotal: lapsTotal > 0 ? lapsTotal : null,
      isStartingGrid,
    },
    trackFlag: resolveTrackFlag(num(telemetry.SessionFlags, 0)),
    standings: buildAllStandings(
      telemetry,
      session,
      drivers,
      playerIdx,
      false,
      stintLapsByCar,
      opponentSectors,
      sessionSectorBestTracked,
      liveSectorStatuses,
      tireCompoundNames,
    ),
    timing: {
      bestLap: formatLapTime(bestLap),
      lastLap: formatLapTime(lastLap),
      sectorCount,
      sectorTimes: liveSectors.sectorTimes,
      sectorStatus: liveSectors.sectorStatus,
      recentLaps: recentLaps.map((lap) => ({
        lapNumber: lap.lapNumber,
        lapTime: lap.lapTime,
        deltaToPrevious: lap.deltaToPrevious,
      })),
    },
    trackMap: buildTrackMap(
      telemetry,
      session,
      drivers,
      playerIdx,
      false,
      pitDurationSec,
    ),
    relative: buildRelative(
      telemetry,
      session,
      drivers,
      playerIdx,
      false,
      stintLapsByCar,
      opponentSectors,
      sessionSectorBestTracked,
      liveSectorStatuses,
      relativeAhead,
      relativeBehind,
      tireCompoundNames,
    ),
    ath: buildAthHud(telemetry, fuelLapsRemaining),
    strategySession: buildStrategySession(
      telemetry,
      session,
      pitDurationSec,
      pitTimeEstimated,
    ),
    strategyLive: buildStrategyLive(
      telemetry,
      stint.index,
      stint.stintLaps,
      stint.stintTimeSec,
    ),
  };
}

export function mapGarageTelemetry(
  telemetry: Telemetry,
  session: SessionData,
  stintRecords: { lapNumber: number; lapTime: string; lapTimeSec: number }[] = [],
  stint: StintRuntime,
  pitDurationSec = 93,
  pitTimeEstimated = true,
  opponentSectors?: Map<number, number[]>,
  sessionSectorBestTracked?: number[],
  stintLapsByCar?: Map<number, number>,
  sessionYaml?: string,
  playerBestSectors?: number[],
): GarageTelemetry {
  const drivers = getDriversWithFlair(session, sessionYaml);
  const playerIdx = num(telemetry.PlayerCarIdx, 0);
  const sectorCount = getSectorCount(session);
  const tireCompoundNames = extractTireCompoundNamesFromYaml(sessionYaml);
  const garageRows = buildGarageRows(
    telemetry,
    session,
    drivers,
    playerIdx,
    opponentSectors,
    sessionSectorBestTracked,
    stintLapsByCar,
    tireCompoundNames,
    playerBestSectors,
  );
  return {
    sectorCount,
    rows: garageRows.rows,
    isStartingGrid: garageRows.isStartingGrid,
    weather: buildWeatherInfo(telemetry),
    stintLaps: buildStintLapSummary(stintRecords),
    tireWear: buildTireWear(telemetry),
    strategySession: buildStrategySession(
      telemetry,
      session,
      pitDurationSec,
      pitTimeEstimated,
    ),
    strategyLive: buildStrategyLive(
      telemetry,
      stint.index,
      stint.stintLaps,
      stint.stintTimeSec,
    ),
  };
}

/** Alias export pour compat tests */
export { msToLapTime };
