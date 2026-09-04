/** État carburant en temps réel. */
export interface LiveFuel {
  niveauLitres: number;
  capaciteLitres: number;
  pourcentage: number;
  consommationLitresParTour: number;
  toursRestantsEstimes: number;
  estime: boolean;
  consoPrevueLitresParTour: number;
  deltaDernierTourConsoLitres: number | null;
  deltaCumuleeConsoLitres: number;
  deltaDernierTourConsoLabel: string | null;
  deltaCumuleeConsoLabel: string;
}

export const DEFAULT_LIVE_FUEL: LiveFuel = {
  niveauLitres: 0,
  capaciteLitres: 0,
  pourcentage: 0,
  consommationLitresParTour: 0,
  toursRestantsEstimes: 0,
  estime: true,
  consoPrevueLitresParTour: 0,
  deltaDernierTourConsoLitres: null,
  deltaCumuleeConsoLitres: 0,
  deltaDernierTourConsoLabel: null,
  deltaCumuleeConsoLabel: "0.00 L",
};
