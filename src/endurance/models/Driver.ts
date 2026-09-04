/** Créneau d'indisponibilité d'un pilote pendant la course. */
export interface AbsenceSlot {
  /** Heure de début (HH:mm), jour de la course. */
  debut: string;
  /** Heure de fin (HH:mm), jour de la course. */
  fin: string;
}

/** Pilote de l'équipe. */
export interface Driver {
  id: string;
  nom: string;
  couleur: string;
  /** Temps au tour en secondes. */
  chronoSecondes: number;
  /** Nombre maximum de relais pour ce pilote. */
  relaisMax: number;
  /** Si coché, le pilote enchaîne deux relais consécutifs à chaque passage. */
  doubleRelaisAutorise: boolean;
  /** Consommation en L/tour (à ce chrono). */
  consommationLitresParTour: number;
  /** Vrai tant que la conso n'a pas été stabilisée en practice. */
  consommationEstimee: boolean;
  absences: AbsenceSlot[];
}

export function createDriver(index: number): Driver {
  const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4"];
  return {
    id: crypto.randomUUID(),
    nom: `Pilote ${index + 1}`,
    couleur: colors[index % colors.length] ?? "#3b82f6",
    chronoSecondes: 105,
    relaisMax: 99,
    doubleRelaisAutorise: false,
    consommationLitresParTour: 1.0,
    consommationEstimee: true,
    absences: [],
  };
}
