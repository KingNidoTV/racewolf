/** Couleur voiture iRacing (entier BGR souvent stocké en 32 bits) */
export function iracingColorToHex(color: number): string {
  if (!color || !Number.isFinite(color)) return "#6b7280";
  const c = color >>> 0;
  const b = (c >> 16) & 0xff;
  const g = (c >> 8) & 0xff;
  const r = c & 0xff;
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
