import type { TireCompound } from "../../src/types/telemetry";

/** Classifie un libellé iRacing (Dry, Primary, Alternate, Wet…). */
export function classifyTireCompoundName(name: string): TireCompound {
  const n = name.trim().toLowerCase();
  if (!n) return "primary";
  if (/(wet|rain|pluie|inter|full\s*w)/.test(n)) return "wet";
  if (/(alt|option|soft)/.test(n)) return "alternate";
  // Dry, Primary, Hard, Medium, Base…
  return "primary";
}

/**
 * CarIdxTireCompound → couleur overlay.
 * - Base / Primary / Dry → blanc
 * - Alternate / Soft → rouge
 * - Wet / Inter → bleu
 *
 * Index iRacing typique (Primary/Alternate/Wet) : 0 / 1 / 2+.
 * Ne pas déduire « 1 = wet » selon les pneus actuellement montés :
 * tant que personne n’est en pluie, l’alternate (1) devenait bleu.
 */
export function mapTireCompound(
  raw: number,
  options?: { compoundNames?: string[] },
): TireCompound {
  const idx = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
  const names = options?.compoundNames;

  if (names && names[idx]) {
    return classifyTireCompoundName(names[idx]);
  }

  // Deux composés seulement, le 2e nommé wet → Dry/Wet.
  if (names?.length === 2 && idx === 1) {
    return classifyTireCompoundName(names[1] ?? "wet");
  }

  if (idx <= 0) return "primary";
  if (idx === 1) return "alternate";
  return "wet";
}

/**
 * Liste ordonnée des composés depuis le YAML session
 * (TireCompoundType / TireCompound).
 */
export function extractTireCompoundNamesFromYaml(
  yaml: string | null | undefined,
): string[] {
  if (!yaml) return [];
  const names: string[] = [];
  const seen = new Set<string>();
  for (const line of yaml.split(/\r?\n/)) {
    const match =
      /^\s*TireCompoundType:\s*(.+?)\s*$/.exec(line) ??
      /^\s*TireCompound:\s*(.+?)\s*$/.exec(line);
    if (!match) continue;
    const name = match[1].replace(/^["']|["']$/g, "").trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    // Ignore valeurs numériques / vides
    if (/^\d+(\.\d+)?$/.test(name)) continue;
    seen.add(name.toLowerCase());
    names.push(name);
  }
  return names;
}
