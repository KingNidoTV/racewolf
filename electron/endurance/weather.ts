import type { LiveWeatherState } from "../../src/endurance/live/models";

const CIEL_LABELS = ["Dégagé", "Peu nuageux", "Nuageux", "Couvert"];
const PISTE_LABELS = [
  "Sec",
  "Sec",
  "Sec",
  "Très légèrement humide",
  "Légèrement humide",
  "Modérément humide",
  "Très humide",
  "Extrêmement humide",
];

export function celsiusFromSdk(value: number): number | null {
  if (value <= 0) return null;
  if (value > 80) return Math.round(((value - 32) * 5) / 9);
  return Math.round(value);
}

/**
 * TrackWetness iRacing : enum 0–7 (1 = sec, pas une fraction 0–1).
 * Skies : 0–3 = couverture nuageuse uniquement (pas la pluie).
 */
export function mapIracingWeather(skies: number, wetness: number): {
  weather: LiveWeatherState;
  rainIntensityPercent: number;
  cielLabel: string;
  pisteLabel: string;
} {
  const w = Math.max(0, Math.round(wetness));
  const s = Math.max(0, Math.min(3, Math.round(skies)));

  let weather: LiveWeatherState = "sec";
  if (w >= 5) weather = "humide";
  else if (w >= 3) weather = "mixte";

  const rainIntensityPercent =
    w <= 1 ? 0 : w === 2 ? 5 : w === 3 ? 20 : w === 4 ? 40 : w === 5 ? 60 : w === 6 ? 80 : 95;

  return {
    weather,
    rainIntensityPercent,
    cielLabel: CIEL_LABELS[s] ?? "—",
    pisteLabel: PISTE_LABELS[Math.min(w, PISTE_LABELS.length - 1)] ?? "—",
  };
}
