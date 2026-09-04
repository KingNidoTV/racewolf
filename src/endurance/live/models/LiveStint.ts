/** Écart par tour vs plan. */
export interface LiveStintLapDelta {
  numeroTour: number;
  tourSecondes: number;
  deltaTempsSec: number;
  deltaConsoLitres: number;
}

/** Progression du relais en cours. */
export interface LiveStint {
  numeroRelais: number;
  piloteId: string | null;
  /** Nom affiché (SDK) si piloteId inconnu. */
  piloteNom: string | null;
  toursCompletes: number;
  toursPrevus: number;
  toursRestants: number;
  dureeEcouleeSec: number;
  dureePrevueSec: number;
  enPit: boolean;
  changementPneusPrevu: boolean;
  /** Index SDK (sorties de pit) — inchangé par le plan. */
  sdkStintIndex?: number;
  /** Dernier tour validé (secondes). */
  dernierTourSecondes: number;
  deltaDernierTourSec: number | null;
  deltaCumuleeTempsSec: number;
  deltaDernierTourLabel: string | null;
  deltaCumuleeTempsLabel: string;
  deltaDernierTourConsoLitres: number | null;
  deltaCumuleeConsoLitres: number;
  historiqueTours: LiveStintLapDelta[];
}

export const DEFAULT_LIVE_STINT: LiveStint = {
  numeroRelais: 1,
  piloteId: null,
  piloteNom: null,
  toursCompletes: 0,
  toursPrevus: 0,
  toursRestants: 0,
  dureeEcouleeSec: 0,
  dureePrevueSec: 0,
  enPit: false,
  changementPneusPrevu: false,
  dernierTourSecondes: 0,
  deltaDernierTourSec: null,
  deltaCumuleeTempsSec: 0,
  deltaDernierTourLabel: null,
  deltaCumuleeTempsLabel: "0.00 s",
  deltaDernierTourConsoLitres: null,
  deltaCumuleeConsoLitres: 0,
  historiqueTours: [],
};
