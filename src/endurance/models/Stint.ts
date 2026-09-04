/** Un relais planifié dans la stratégie. */
export interface Stint {
  /** Numéro de relais (1-based). */
  numero: number;
  /** Heure de début (HH:mm:ss). */
  heureDebut: string;
  /** Heure de fin (HH:mm:ss). */
  heureFin: string;
  /** Identifiant du pilote assigné. */
  piloteId: string;
  /** Nombre de tours prévus sur ce relais. */
  toursPrevus: number;
  /** Durée du relais en secondes (hors pit). */
  dureeSecondes: number;
  /** Carburant consommé sur ce relais (litres). */
  carburantUtiliseLitres: number;
  /** Tours max possibles sur ce plein (info planification). */
  toursMaxCarburant: number;
  /** Changement de pneus au début de ce relais (pit avant le relais). */
  changementPneus: boolean;
}
