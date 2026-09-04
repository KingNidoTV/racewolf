/** Code pays ISO 3166-1 alpha-2 → emoji drapeau */
export function flagEmoji(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) return "🏁";
  const base = 0x1f1e6;
  return String.fromCodePoint(
    base + code.charCodeAt(0) - 65,
    base + code.charCodeAt(1) - 65,
  );
}
