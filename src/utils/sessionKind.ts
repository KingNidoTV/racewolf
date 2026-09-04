/** Practice / qualif : afficher les secteurs dans le classement course. */
export function isPracticeOrQualifying(sessionType: string): boolean {
  const s = sessionType.toLowerCase();
  if (/\brace\b/.test(s) || s.includes("course")) return false;
  return (
    s.includes("practice") ||
    s.includes("pratique") ||
    s.includes("essai") ||
    s.includes("qualif") ||
    s.includes("test") ||
    s.includes("time trial")
  );
}
