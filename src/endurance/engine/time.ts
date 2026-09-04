const TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
const LAP_TIME_RE = /^(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/;

/** Parse HH:mm ou HH:mm:ss en secondes depuis minuit. */
export function parseClockToSeconds(value: string): number {
  const match = TIME_RE.exec(value.trim());
  if (!match) return 0;
  const hours = Number.parseInt(match[1] ?? "0", 10);
  const minutes = Number.parseInt(match[2] ?? "0", 10);
  const seconds = Number.parseInt(match[3] ?? "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/** Parse m:ss.SSS en secondes. */
export function parseLapTimeToSeconds(value: string): number {
  const match = LAP_TIME_RE.exec(value.trim());
  if (!match) return 0;
  const minutes = Number.parseInt(match[1] ?? "0", 10);
  const seconds = Number.parseInt(match[2] ?? "0", 10);
  const millis = match[3] ?? "0";
  const fraction = Number.parseInt(millis.padEnd(3, "0").slice(0, 3), 10) / 1000;
  return minutes * 60 + seconds + fraction;
}

/** Formate des secondes en HH:mm:ss. */
export function formatSecondsToClock(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Formate des secondes en m:ss.SSS. */
export function formatSecondsToLapTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "0:00.000";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  const whole = Math.floor(seconds);
  const millis = Math.round((seconds - whole) * 1000);
  return `${minutes}:${String(whole).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

/** Formate une durée en heures/minutes lisibles (ex. 6h 00). */
export function formatDurationMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}`;
}

/** Timestamp absolu (ms) à partir de la date et d'une heure HH:mm. */
export function toRaceTimestampMs(dateIso: string, clock: string): number {
  const base = new Date(`${dateIso}T00:00:00`);
  return base.getTime() + parseClockToSeconds(clock) * 1000;
}

/** Heure HH:mm:ss à partir d'un timestamp absolu (ms). */
export function timestampMsToClock(ms: number): string {
  const date = new Date(ms);
  const h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Deux intervalles [start, end) se chevauchent-ils ? */
export function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

/** Intervalle d'absence en ms (gère fin après minuit). */
export function absenceIntervalMs(
  dateCourse: string,
  debut: string,
  fin: string,
): { debutMs: number; finMs: number } {
  const debutMs = toRaceTimestampMs(dateCourse, debut);
  let finMs = toRaceTimestampMs(dateCourse, fin);
  if (finMs <= debutMs) {
    finMs += MS_PAR_JOUR;
  }
  return { debutMs, finMs };
}
