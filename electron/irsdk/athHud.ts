import type {
  AthHud,
  StintLapSummary,
  TireWearInfo,
  WeatherInfo,
} from "../../src/types/telemetry";
import { formatLapTime } from "./format";

type Telemetry = Record<string, unknown>;

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Eau / huile moteur : iRacing envoie déjà des °C (peuvent dépasser 80). */
function engineTempC(value: number): number {
  if (value <= 0) return 0;
  return Math.round(value);
}

/** Températures piste / air (°C ou °F selon réglage sim). */
function weatherTempC(value: number): number {
  if (value <= 0) return 0;
  // Au-delà de ~45 °C en valeur brute, c'est très probablement du °F.
  if (value > 45) return Math.round(((value - 32) * 5) / 9);
  return Math.round(value);
}

export function buildAthHud(
  telemetry: Telemetry,
  /** Tours restants essence (moyenne L/tour), déjà lissés. */
  fuelLapsRemainingOverride?: number | null,
): AthHud {
  const maxRpm =
    num(telemetry.DriverCarSLBlinkRPM, 0) ||
    num(telemetry.DriverCarRedLine, 7500) ||
    7500;

  const batteryRaw = num(telemetry.EnergyERSBatteryPct, -1);
  const batteryAlt = num(telemetry.EnergyERSBattery, -1);
  let batteryPercent: number | null = null;
  if (batteryRaw >= 0) {
    batteryPercent = Math.round(
      batteryRaw <= 1 ? batteryRaw * 100 : batteryRaw,
    );
  } else if (batteryAlt >= 0) {
    batteryPercent = Math.round(batteryAlt <= 1 ? batteryAlt * 100 : batteryAlt);
  }

  const p2pArr = telemetry.PushToPass as boolean[] | undefined;
  const playerIdx = num(telemetry.PlayerCarIdx, 0);
  let pushToPassPercent: number | null = null;
  if (Array.isArray(p2pArr) && p2pArr[playerIdx] != null) {
    pushToPassPercent = p2pArr[playerIdx] ? 100 : 0;
  } else {
    const dcP2p = num(telemetry.dcPushToPass, -1);
    if (dcP2p >= 0) {
      pushToPassPercent = Math.round(dcP2p <= 1 ? dcP2p * 100 : dcP2p);
    }
  }

  const drsStatus = num(telemetry.DRS_Status, -1);
  const drsAvailable = drsStatus >= 0;
  const drsActive = drsStatus > 0;

  const fuelLevel = num(telemetry.FuelLevel, 0);
  const fuelLapsRemaining =
    fuelLapsRemainingOverride != null && fuelLapsRemainingOverride > 0
      ? fuelLapsRemainingOverride
      : null;

  const waterRaw = num(telemetry.WaterTemp, -1);
  const oilRaw = num(telemetry.OilTemp, -1);

  return {
    speedKmh: Math.round(num(telemetry.Speed, 0) * 3.6),
    gear: num(telemetry.Gear, 0),
    rpm: Math.round(num(telemetry.RPM, 0)),
    maxRpm,
    fuelLiters: fuelLevel,
    fuelPercent: Math.round(num(telemetry.FuelLevelPct, 0) * 100),
    fuelLapsRemaining,
    throttle: clamp01(num(telemetry.Throttle, 0)),
    brake: clamp01(num(telemetry.Brake, 0)),
    clutch: clamp01(
      num(
        num(telemetry.Clutch, -1) >= 0
          ? telemetry.Clutch
          : telemetry.ClutchRaw,
        0,
      ),
    ),
    waterTempC: waterRaw > 0 ? engineTempC(waterRaw) : null,
    oilTempC: oilRaw > 0 ? engineTempC(oilRaw) : null,
    drsAvailable,
    drsActive,
    batteryPercent,
    pushToPassPercent,
  };
}

export function buildWeatherInfo(telemetry: Telemetry): WeatherInfo {
  const skies = num(telemetry.Skies, 0);
  const wetness = Math.max(0, Math.round(num(telemetry.TrackWetness, 0)));
  const skiesLabels = [
    "Dégagé",
    "Peu nuageux",
    "Nuageux",
    "Couvert",
  ];
  /** TrackWetness iRacing 0–7 (1 = Dry). ≤2 (~<10 %) → Sec. */
  const wetLabels = [
    "Sec", // 0 Unknown
    "Sec", // 1 Dry
    "Sec", // 2 MostlyDry
    "Très légèrement humide", // 3
    "Légèrement humide", // 4
    "Modérément humide", // 5
    "Très humide", // 6
    "Extrêmement humide", // 7
  ];

  const airTempC = weatherTempC(num(telemetry.AirTemp, 0));
  const trackTempC = weatherTempC(
    num(telemetry.TrackTempCrew, 0) || num(telemetry.TrackTemp, 0),
  );

  let rainAlert: string | null = null;
  if (num(telemetry.WeatherDeclaredWet, 0) > 0) {
    rainAlert = "Session déclarée humide — pneus pluie";
  } else if (wetness >= 5) {
    rainAlert = "Piste humide — pluie possible prochainement";
  } else if (skies >= 3 && wetness >= 3) {
    rainAlert = "Risque pluie : surveiller évolution météo";
  }

  return {
    airTempC,
    trackTempC,
    skiesLabel: skiesLabels[Math.min(skies, skiesLabels.length - 1)] ?? "—",
    trackWetnessLabel:
      wetLabels[Math.min(wetness, wetLabels.length - 1)] ?? "—",
    rainAlert,
  };
}

export function buildTireWear(telemetry: Telemetry): TireWearInfo {
  const read = (key: string) => {
    const v = num(telemetry[key], -1);
    if (v < 0) return -1;
    return Math.round(v <= 1 ? v * 100 : v);
  };

  const lf = read("LFwearM");
  const rf = read("RFwearM");
  const lr = read("LRwearM");
  const rr = read("RRwearM");

  const corners = {
    lf: lf >= 0 ? lf : 100,
    rf: rf >= 0 ? rf : 100,
    lr: lr >= 0 ? lr : 100,
    rr: rr >= 0 ? rr : 100,
  };

  const avg = Math.round((corners.lf + corners.rf + corners.lr + corners.rr) / 4);
  return { corners, averagePercent: avg };
}

export function buildStintLapSummary(
  records: { lapNumber: number; lapTime: string; lapTimeSec: number }[],
): StintLapSummary {
  if (records.length === 0) {
    return { laps: [], averageLap: "—" };
  }

  const sum = records.reduce((a, r) => a + r.lapTimeSec, 0);
  const avgSec = sum / records.length;
  const averageLap = avgSec > 0 ? formatLapTime(avgSec) : "—";

  const laps = records.map((r) => {
    const delta = r.lapTimeSec - avgSec;
    const deltaStr =
      Math.abs(delta) < 0.001
        ? "±0.000"
        : delta > 0
          ? `+${delta.toFixed(3)}`
          : delta.toFixed(3);
    return {
      lapNumber: r.lapNumber,
      lapTime: r.lapTime,
      deltaToAvg: deltaStr,
    };
  });

  return { laps, averageLap };
}
