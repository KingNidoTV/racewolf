/** Type de durée de course. */
export type RaceDurationType = "time" | "laps";

/** Paramètres de course pour la préparation endurance. */
export interface RaceSettings {
  /** Date au format ISO (YYYY-MM-DD). */
  date: string;
  /** Heure de départ (HH:mm). */
  startTime: string;
  dureeType: RaceDurationType;
  /** Durée totale en minutes (si dureeType === "time"). */
  durationMinutes: number;
  /** Nombre total de tours (si dureeType === "laps"). */
  durationLaps: number;
  /** Identifiant catalogue circuit. */
  circuitId: string;
  /** Libellé affiché du circuit. */
  circuit: string;
  /** Identifiant catalogue voiture. */
  voitureId: string;
  /** Libellé affiché de la voiture. */
  voiture: string;
  /** Temps moyen d'un arrêt aux stands, en secondes (mesuré en practice). */
  tempsPitMoyenSecondes: number;
  /** Vrai tant que le pit n'a pas été mesuré sur au moins 2 arrêts. */
  tempsPitEstime: boolean;
  /** Capacité du réservoir plein en litres (liée à la voiture). */
  capaciteReservoirLitres: number;
  /** Vrai tant que la capacité n'a pas été mesurée en practice. */
  capaciteReservoirEstimee: boolean;
  /** Nombre de trains de pneus disponibles (ignoré si trainsPneusIllimites). */
  nombreTrainsPneus: number;
  /** Aucune limite sur les changements de pneus. */
  trainsPneusIllimites: boolean;
}

export const DEFAULT_RACE_SETTINGS: RaceSettings = {
  date: new Date().toISOString().slice(0, 10),
  startTime: "14:00",
  dureeType: "time",
  durationMinutes: 6 * 60,
  durationLaps: 120,
  circuitId: "",
  circuit: "",
  voitureId: "",
  voiture: "",
  tempsPitMoyenSecondes: 93,
  tempsPitEstime: true,
  capaciteReservoirLitres: 100,
  capaciteReservoirEstimee: true,
  nombreTrainsPneus: 3,
  trainsPneusIllimites: false,
};

export function formatRaceDuration(settings: RaceSettings): string {
  if (settings.dureeType === "laps") {
    return `${settings.durationLaps} tours`;
  }
  const h = Math.floor(settings.durationMinutes / 60);
  const m = settings.durationMinutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}`;
}
