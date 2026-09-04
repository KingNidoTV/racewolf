export interface CatalogEntry {
  id: string;
  label: string;
  /** Présent sur les circuits (filtrage route / oval). */
  category?: string;
}

export interface CarEntry extends CatalogEntry {
  capaciteReservoirLitres: number;
}
