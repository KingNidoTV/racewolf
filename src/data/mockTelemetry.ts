import type {
  GarageTelemetry,
  GarageRow,
  RacingTelemetry,
  SectorStatus,
  StandingsEntry,
  StintLapSummary,
  TireWearInfo,
  TrackFlagState,
  TrackMapData,
  WeatherInfo,
} from "../types/telemetry";
import type { StrategyLive, StrategySessionInfo } from "../types/strategy";
import { brandColor } from "./brands";
import {
  garageSectorStatuses,
} from "../utils/garageSectorStatus";
import { markSessionFastestLap } from "../utils/sessionFastestLap";

const MOCK_SESSION_BEST_SECTORS: [number, number, number] = [
  30.412, 31.955, 29.509,
];

const MOCK_GARAGE_SECTORS_RAW: [number, number, number][] = [
  [30.412, 32.108, 29.582],
  [30.601, 31.955, 29.9],
  [30.89, 32.492, 29.509],
  [31.102, 32.204, 29.908],
  [30.72, 32.31, 29.65],
  [30.95, 32.18, 29.88],
  [31.2, 32.05, 30.01],
  [30.88, 32.22, 29.77],
  [31.05, 32.14, 29.92],
  [30.99, 32.26, 29.84],
];

function formatSectorMock(sec: number): string {
  return sec.toFixed(3);
}

const MOCK_STANDINGS_RAW: StandingsEntry[] = [
  {
    position: 1,
    carNumber: "12",
    name: "A. Martin",
    carBrand: "BMW M4 GT4",
    carColor: brandColor("BMW M4 GT4", "#0066B1"),
    nationality: "FR",
    bestTime: "1:32.102",
    gap: "—",
    tireCompound: "primary",
    stintLaps: 14,
  },
  {
    position: 2,
    carNumber: "07",
    name: "B. Chen",
    carBrand: "Porsche 718 GT4",
    carColor: brandColor("Porsche 718 GT4", "#FFFFFF"),
    nationality: "US",
    bestTime: "1:32.456",
    gap: "+0.354",
    tireCompound: "alternate",
    stintLaps: 9,
    inPits: true,
  },
  {
    position: 3,
    carNumber: "55",
    name: "C. Silva",
    carBrand: "Ferrari 488 GT3",
    carColor: brandColor("Ferrari 488 GT3", "#DC0000"),
    nationality: "BR",
    bestTime: "1:32.701",
    gap: "+0.599",
    tireCompound: "primary",
    stintLaps: 11,
    hasPenalty: true,
    status: "penalty",
  },
  {
    position: 4,
    carNumber: "19",
    name: "E. Weber",
    carBrand: "Audi R8 LMS GT4",
    carColor: brandColor("Audi R8 LMS GT4", "#4A4A4A"),
    nationality: "DE",
    bestTime: "1:32.812",
    gap: "+0.710",
    tireCompound: "primary",
    stintLaps: 16,
  },
  {
    position: 5,
    carNumber: "33",
    name: "G. Lopez",
    carBrand: "McLaren 570S GT4",
    carColor: brandColor("McLaren 570S GT4", "#FF8700"),
    nationality: "ES",
    bestTime: "1:32.891",
    gap: "+0.789",
    tireCompound: "primary",
    stintLaps: 12,
  },
  {
    position: 6,
    carNumber: "88",
    name: "D. Rossi",
    carBrand: "Aston Martin Vantage GT4",
    carColor: brandColor("Aston Martin Vantage GT4", "#006F51"),
    nationality: "IT",
    bestTime: "1:33.204",
    gap: "+1.102",
    tireCompound: "primary",
    stintLaps: 17,
    hasDamage: true,
    status: "damage",
  },
  {
    position: 7,
    carNumber: "23",
    name: "K. Nielsen",
    carBrand: "Ford Mustang GT4",
    carColor: brandColor("Ford Mustang GT4", "#003399"),
    nationality: "DK",
    bestTime: "1:33.410",
    gap: "+1.308",
    tireCompound: "primary",
    stintLaps: 8,
    isConnected: false,
  },
  {
    position: 8,
    carNumber: "31",
    name: "L. Park",
    carBrand: "Mercedes-AMG GT3",
    carColor: brandColor("Mercedes-AMG GT3", "#00D2BE"),
    nationality: "KR",
    bestTime: "1:33.588",
    gap: "+1.486",
    tireCompound: "alternate",
    stintLaps: 6,
  },
  {
    position: 9,
    carNumber: "09",
    name: "M. Dupont",
    carBrand: "Lamborghini Huracan GT4",
    carColor: brandColor("Lamborghini Huracan GT4", "#9ACD32"),
    nationality: "FR",
    bestTime: "1:33.902",
    gap: "+1.800",
    tireCompound: "primary",
    stintLaps: 10,
  },
  {
    position: 10,
    carNumber: "77",
    name: "S. Okada",
    carBrand: "Toyota GR Supra GT4",
    carColor: brandColor("Toyota GR Supra GT4", "#141414"),
    nationality: "JP",
    bestTime: "1:34.120",
    gap: "+2.018",
    tireCompound: "primary",
    stintLaps: 15,
  },
  {
    position: 11,
    carNumber: "04",
    name: "T. Lewis",
    carBrand: "Mercedes-AMG GT4",
    carColor: brandColor("Mercedes-AMG GT4", "#00D2BE"),
    nationality: "GB",
    bestTime: "1:34.280",
    gap: "+2.178",
    tireCompound: "alternate",
    stintLaps: 7,
  },
  {
    position: 12,
    carNumber: "61",
    name: "N. Costa",
    carBrand: "Porsche 911 GT3 R",
    carColor: brandColor("Porsche 911 GT3 R", "#FFFFFF"),
    nationality: "PT",
    bestTime: "1:34.350",
    gap: "+2.248",
    tireCompound: "primary",
    stintLaps: 11,
  },
  {
    position: 13,
    carNumber: "18",
    name: "P. Moreau",
    carBrand: "BMW M4 GT3",
    carColor: brandColor("BMW M4 GT3", "#0066B1"),
    nationality: "FR",
    bestTime: "1:34.410",
    gap: "+2.308",
    tireCompound: "primary",
    stintLaps: 13,
  },
  {
    position: 14,
    carNumber: "27",
    name: "J. Andersson",
    carBrand: "Audi R8 LMS GT3",
    carColor: brandColor("Audi R8 LMS GT3", "#4A4A4A"),
    nationality: "SE",
    bestTime: "1:34.480",
    gap: "+2.378",
    tireCompound: "primary",
    stintLaps: 9,
  },
  {
    position: 15,
    carNumber: "42",
    name: "H. Bernard",
    carBrand: "McLaren 570S GT4",
    carColor: brandColor("McLaren 570S GT4", "#FF8700"),
    nationality: "BE",
    bestTime: "1:34.550",
    gap: "+2.448",
    tireCompound: "primary",
    stintLaps: 12,
    isPlayer: true,
  },
  {
    position: 16,
    carNumber: "99",
    name: "R. Kim",
    carBrand: "BMW M4 GT4",
    carColor: brandColor("BMW M4 GT4", "#0066B1"),
    nationality: "KR",
    bestTime: "1:34.620",
    gap: "+2.518",
    tireCompound: "primary",
    stintLaps: 5,
  },
  {
    position: 17,
    carNumber: "14",
    name: "F. Novak",
    carBrand: "Ferrari 296 GT3",
    carColor: brandColor("Ferrari 296 GT3", "#DC0000"),
    nationality: "CZ",
    bestTime: "1:34.710",
    gap: "+2.608",
    tireCompound: "alternate",
    stintLaps: 8,
  },
  {
    position: 18,
    carNumber: "66",
    name: "I. Petrov",
    carBrand: "Aston Martin Vantage GT3",
    carColor: brandColor("Aston Martin Vantage GT3", "#006F51"),
    nationality: "RU",
    bestTime: "1:34.800",
    gap: "+2.698",
    tireCompound: "primary",
    stintLaps: 10,
  },
  {
    position: 19,
    carNumber: "03",
    name: "W. Brown",
    carBrand: "Ford Mustang GT4",
    carColor: brandColor("Ford Mustang GT4", "#003399"),
    nationality: "AU",
    bestTime: "1:34.890",
    gap: "+2.788",
    tireCompound: "primary",
    stintLaps: 6,
  },
  {
    position: 20,
    carNumber: "51",
    name: "Y. Tanaka",
    carBrand: "Toyota GR Supra GT4",
    carColor: brandColor("Toyota GR Supra GT4", "#141414"),
    nationality: "JP",
    bestTime: "1:34.980",
    gap: "+2.878",
    tireCompound: "primary",
    stintLaps: 4,
  },
];

const MOCK_STANDINGS = markSessionFastestLap(
  (() => {
    type ClassDef = {
      id: number;
      name: string;
      relSpeed: number;
      match: (brand: string) => boolean;
    };

    const classes: ClassDef[] = [
      {
        id: 1,
        name: "GT3",
        relSpeed: 130,
        match: (b) => /GT3/i.test(b) || (!/TCR|Civic|MX-?5|Miata/i.test(b) && !/GT4/i.test(b)),
      },
      {
        id: 2,
        name: "GT4",
        relSpeed: 110,
        // Réservé si besoin ; la démo regroupe le peloton principal en GT3
        match: (b) => /GT4/i.test(b),
      },
      {
        id: 3,
        name: "TCR",
        relSpeed: 95,
        match: (b) => /TCR|Civic/i.test(b),
      },
      {
        id: 4,
        name: "MX-5",
        relSpeed: 80,
        match: (b) => /MX-?5|Miata/i.test(b),
      },
    ];

    /** Réécrit quelques voitures pour une démo multi-classe (GT3 + leaders TCR / MX-5). */
    const branded = MOCK_STANDINGS_RAW.map((row, index) => {
      // D'abord les autres catégories (sinon le passage GT4→GT3 les écrase)
      if (index === 9 || index === 15) {
        return {
          ...row,
          carBrand: "Honda Civic Type R",
          carColor: brandColor("Honda Civic Type R", "#E4002B"),
        };
      }
      if (index === 10 || index === 18) {
        return {
          ...row,
          name: index === 10 ? "R. Kovacs" : "W. Brown",
          carBrand: "Mazda MX-5 Cup",
          carColor: brandColor("Mazda MX-5 Cup", "#101010"),
        };
      }
      // Peloton principal → GT3
      if (/GT4/i.test(row.carBrand)) {
        return {
          ...row,
          carBrand: row.carBrand.replace(/GT4/i, "GT3"),
        };
      }
      return row;
    });

    const withClass = branded.map((row) => {
      const def =
        classes.find((c) => c.match(row.carBrand)) ?? classes[0]!;
      return {
        ...row,
        classId: def.id,
        className: def.name,
        classRelSpeed: def.relSpeed,
      };
    });

    const classCounts = new Map<number, number>();
    return withClass.map((row) => {
      const prev = classCounts.get(row.classId!) ?? 0;
      const classPosition = prev + 1;
      classCounts.set(row.classId!, classPosition);
      return { ...row, classPosition };
    });
  })(),
);

const MOCK_WEATHER: WeatherInfo = {
  airTempC: 24,
  trackTempC: 42,
  skiesLabel: "Peu nuageux",
  trackWetnessLabel: "Sec",
  rainAlert: null,
};

const MOCK_STINT_LAPS: StintLapSummary = {
  averageLap: "1:33.012",
  laps: [
    { lapNumber: 13, lapTime: "1:33.204", deltaToAvg: "+0.192" },
    { lapNumber: 12, lapTime: "1:32.891", deltaToAvg: "-0.121" },
    { lapNumber: 11, lapTime: "1:33.088", deltaToAvg: "+0.076" },
    { lapNumber: 10, lapTime: "1:32.956", deltaToAvg: "-0.056" },
    { lapNumber: 9, lapTime: "1:33.120", deltaToAvg: "+0.108" },
  ],
};

const MOCK_TIRE_WEAR: TireWearInfo = {
  corners: { lf: 78, rf: 76, lr: 82, rr: 80 },
  averagePercent: 79,
};

const MOCK_STRATEGY_SESSION: StrategySessionInfo = {
  date: "31/01/2026",
  startTime: "15:00",
  duration: "24:00:00",
  car: "Acura",
  track: "Road Atlanta",
  pitTime: "0:01:33",
  pitTimeEstimated: true,
};

const MOCK_STRATEGY_LIVE: StrategyLive = {
  activeStintIndex: 1,
  currentStintLaps: 12,
  stintTimeSec: 12 * 92,
  sessionTimeRemaining: "22:14:32",
  avgLapSec: 92.1,
  repairTimeSec: 0,
  weatherChange: false,
};

function buildMockRelative(all: StandingsEntry[]): StandingsEntry[] {
  const player = all.find((r) => r.isPlayer);
  if (!player) return [];
  const min = player.position - 10;
  const max = player.position + 10;
  return all
    .filter(
      (r) =>
        r.position >= min &&
        r.position <= max &&
        (r.isPlayer ||
          (!r.inPits &&
            r.status !== "box" &&
            r.isConnected !== false)),
    )
    .map((r) => ({
      ...r,
      lastLap: r.lastLap ?? r.bestTime ?? "—",
      gap:
        r.isPlayer
          ? "—"
          : r.position < player.position
            ? `+${((player.position - r.position) * 0.35 + 0.2).toFixed(1)}`
            : `-${((r.position - player.position) * 0.35 + 0.15).toFixed(1)}`,
    }));
}

function buildMockTrackMap(standings: StandingsEntry[]): TrackMapData {
  return {
    trackId: 0,
    trackSlug: "road-atlanta",
    trackName: "Road Atlanta",
    startFinishPct: 0,
    sectorStartPcts: [0, 1 / 3, 2 / 3],
    sectorStartPctsGame: [0, 1 / 3, 2 / 3],
    playerLapDistPctGame: 0.42,
    cars: (() => {
      const leaderByClass = new Map<number, number>();
      for (const row of standings) {
        const cid = row.classId ?? 0;
        const best = leaderByClass.get(cid);
        if (best == null || row.position < best) {
          leaderByClass.set(cid, row.position);
        }
      }
      return standings.map((row, i) => ({
        carIdx: i,
        position: row.position,
        carNumber: row.carNumber,
        lapDistPct: Math.min(
          0.95,
          0.04 + (i / Math.max(1, standings.length)) * 0.9,
        ),
        carColor: row.carColor,
        isPlayer: row.isPlayer,
        onPit: row.inPits || row.status === "box",
        isClassLeader:
          row.position === (leaderByClass.get(row.classId ?? 0) ?? -1),
        classId: row.classId,
        classRelSpeed: row.classRelSpeed,
      }));
    })(),
    pitGhost: { lapDistPct: 0.935, active: true },
  };
}

function standingsToGarageRow(
  row: StandingsEntry,
  sectorIdx: number,
): GarageRow {
  const laps = 28 - row.position;
  const raw =
    MOCK_GARAGE_SECTORS_RAW[sectorIdx % MOCK_GARAGE_SECTORS_RAW.length];
  return {
    position: row.position,
    carNumber: row.carNumber,
    carBrand: row.carBrand,
    carColor: row.carColor,
    nationality: row.nationality,
    driverName: row.name,
    bestTime: row.bestTime,
    gap: row.position === 1 ? "—" : row.gap,
    bestLapSectorTimes: [
      formatSectorMock(raw[0]),
      formatSectorMock(raw[1]),
      formatSectorMock(raw[2]),
    ],
    bestLapSectorStatus: garageSectorStatuses(
      raw,
      MOCK_SESSION_BEST_SECTORS,
    ),
    lapsCompleted: Math.max(0, laps),
    lapsLastStint: row.stintLaps,
    bestLapNumber: Math.max(1, 20 - row.position),
    tireCompound: row.tireCompound,
    status: row.status === "box" ? "box" : null,
    isPlayer: row.isPlayer,
    classId: row.classId,
    className: row.className,
    classPosition: row.classPosition,
    classRelSpeed: row.classRelSpeed,
  };
}

function withMockSectorBars(rows: StandingsEntry[]): StandingsEntry[] {
  const mockLive: SectorStatus[][] = [
    ["record", "personal", "pending"],
    ["personal", "slower", "record"],
    ["pending", "pending", "pending"],
    ["slower", "record", "personal"],
    ["record", "record", "slower"],
    ["personal", "pending", "slower"],
    ["pending", "personal", "record"],
    ["slower", "slower", "pending"],
  ];

  return rows.map((row, i) => {
    const raw = MOCK_GARAGE_SECTORS_RAW[i % MOCK_GARAGE_SECTORS_RAW.length];
    return {
      ...row,
      bestLapSectorTimes: [
        formatSectorMock(raw[0]),
        formatSectorMock(raw[1]),
        formatSectorMock(raw[2]),
      ],
      bestLapSectorStatus:
        mockLive[i % mockLive.length] ??
        (["pending", "pending", "pending"] as SectorStatus[]),
    };
  });
}

export const DEMO_TRACK_FLAG_CYCLE: TrackFlagState[] = [
  { kind: "green", label: "Drapeau vert" },
  { kind: "yellow", label: "Drapeau jaune" },
  { kind: "surface", label: "Changement d’adhérence" },
  { kind: "black", label: "Drapeau noir" },
  { kind: "yellow-waving", label: "Drapeau jaune agité" },
  { kind: "checkered", label: "Drapeau à damier" },
  { kind: "red", label: "Drapeau rouge" },
  { kind: "white", label: "Drapeau blanc" },
  { kind: "blue", label: "Drapeau bleu" },
  { kind: "one-lap-green", label: "1 tour avant le vert" },
];

const MOCK_RACING_BASE = {
  series: "IMSA VP Racing SportsCar Challenge",
  track: "Road Atlanta",
  raceTitle: "IMSA Michelin Pilot Challenge — Road Atlanta",
  timeRemaining: "42:18",
  sessionProgress: 0.38,
  lap: 14,
  lapsTotal: 45,
} as const;

const MOCK_RACING_SHARED = {
  trackFlag: {
    kind: "yellow" as const,
    label: "Drapeau jaune",
  },
  timing: {
    bestLap: "1:32.456",
    lastLap: "1:33.012",
    sectorCount: 3,
    sectorTimes: ["28.412", "32.108", "32.492"],
    sectorStatus: ["record", "personal", "slower"] as SectorStatus[],
    recentLaps: [
      { lapNumber: 14, lapTime: "1:33.012", deltaToPrevious: "+0.412" },
      { lapNumber: 13, lapTime: "1:32.600", deltaToPrevious: "-0.108" },
      { lapNumber: 12, lapTime: "1:32.891", deltaToPrevious: "+0.291" },
      { lapNumber: 11, lapTime: "1:32.708", deltaToPrevious: "+0.220" },
      { lapNumber: 10, lapTime: "1:32.488", deltaToPrevious: "—" },
    ],
  },
  trackMap: buildMockTrackMap(MOCK_STANDINGS),
  relative: buildMockRelative(MOCK_STANDINGS),
  ath: {
    speedKmh: 187,
    gear: 4,
    rpm: 6420,
    maxRpm: 7500,
    fuelLiters: 42.3,
    fuelPercent: 68,
    fuelLapsRemaining: 14,
    throttle: 0.72,
    brake: 0,
    clutch: 0,
    drsAvailable: true,
    drsActive: false,
    batteryPercent: 64,
    pushToPassPercent: 85,
    waterTempC: 88,
    oilTempC: 102,
  },
  strategySession: MOCK_STRATEGY_SESSION,
  strategyLive: MOCK_STRATEGY_LIVE,
};

export const MOCK_RACING_RACE: RacingTelemetry = {
  session: {
    ...MOCK_RACING_BASE,
    sessionType: "Course",
  },
  standings: MOCK_STANDINGS,
  ...MOCK_RACING_SHARED,
};

export const MOCK_RACING_PRACTICE: RacingTelemetry = {
  session: {
    ...MOCK_RACING_BASE,
    sessionType: "Practice",
  },
  standings: withMockSectorBars(MOCK_STANDINGS),
  ...MOCK_RACING_SHARED,
};

export const MOCK_RACING: RacingTelemetry = MOCK_RACING_RACE;

export const MOCK_GARAGE: GarageTelemetry = {
  sectorCount: 3,
  rows: MOCK_STANDINGS.map((row, i) => standingsToGarageRow(row, i)),
  weather: MOCK_WEATHER,
  stintLaps: MOCK_STINT_LAPS,
  tireWear: MOCK_TIRE_WEAR,
  strategySession: MOCK_STRATEGY_SESSION,
  strategyLive: MOCK_STRATEGY_LIVE,
};
