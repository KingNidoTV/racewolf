/** Force l’affichage relatif à une décimale (+1.2 / -0.8). */
export function formatGapOneDecimal(gap: string): string {
  const trimmed = gap.trim();
  if (!trimmed || trimmed === "—") return "—";

  const match = trimmed.match(/^([+-]?)(\d+(?:\.\d+)?)/);
  if (!match) return trimmed;

  const sign = match[1] || (trimmed.startsWith("-") ? "-" : "+");
  const value = parseFloat(match[2]);
  if (!Number.isFinite(value)) return trimmed;

  const formatted = Math.abs(value).toFixed(1);
  if (sign === "-") return `-${formatted}`;
  if (sign === "+") return `+${formatted}`;
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}
