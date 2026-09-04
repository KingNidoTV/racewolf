/** Position d'un panneau en % de l'écran (coin haut-gauche) + échelle. */
export interface OverlayPanelPosition {
  x: number;
  y: number;
  /** Échelle visuelle (0.5 – 2). */
  scale: number;
}

export type OverlayPanelVisibilityKey =
  | "standings"
  | "timing"
  | "trackmap"
  | "relative"
  | "strategy"
  | "boxCall"
  | "hud";

export type OverlayPanelLayout = Record<
  OverlayPanelVisibilityKey,
  OverlayPanelPosition
>;

/** Positions par défaut (équivalent ancienne grille 3×3). */
export const DEFAULT_OVERLAY_LAYOUT: OverlayPanelLayout = {
  standings: { x: 1.2, y: 1.5, scale: 1 },
  timing: { x: 72, y: 1.5, scale: 1 },
  trackmap: { x: 81, y: 30, scale: 1 },
  boxCall: { x: 85, y: 46, scale: 1 },
  relative: { x: 1.2, y: 64, scale: 1 },
  strategy: { x: 30, y: 90, scale: 1 },
  hud: { x: 87, y: 74, scale: 1 },
};

/** Préférences d'affichage des panneaux overlay course. */
export interface OverlayPanelPrefs {
  standings: boolean;
  timing: boolean;
  trackmap: boolean;
  relative: boolean;
  strategy: boolean;
  boxCall: boolean;
  hud: boolean;
  /** Placement libre des panneaux (% écran). */
  layout: OverlayPanelLayout;
  /** Nombre de pilotes dans le top classement (1–20). */
  standingsTopN: number;
  /** Pilotes devant nous hors top (0–10). */
  standingsAhead: number;
  /** Pilotes derrière nous hors top (0–10). */
  standingsBehind: number;
  /** Afficher le classement des autres catégories. */
  standingsShowOtherClasses: boolean;
  /** Nombre de tours récents dans Chronos (1–15). */
  timingRecentLaps: number;
  /** Pilotes devant nous au relatif (0–10). */
  relativeAhead: number;
  /** Pilotes derrière nous au relatif (0–10). */
  relativeBehind: number;
  /** Raccourcis radio (code KeyboardEvent.code). */
  radioKeyCopy: string;
  radioKeyYes: string;
  radioKeyNo: string;
  radioKeyFullPush: string;
}

export const DEFAULT_OVERLAY_PREFS: OverlayPanelPrefs = {
  standings: true,
  timing: true,
  trackmap: true,
  relative: true,
  strategy: true,
  boxCall: true,
  hud: true,
  layout: { ...DEFAULT_OVERLAY_LAYOUT },
  standingsTopN: 10,
  standingsAhead: 1,
  standingsBehind: 1,
  standingsShowOtherClasses: true,
  timingRecentLaps: 5,
  relativeAhead: 2,
  relativeBehind: 2,
  radioKeyCopy: "KeyC",
  radioKeyYes: "KeyY",
  radioKeyNo: "KeyN",
  radioKeyFullPush: "KeyF",
};

export const OVERLAY_PANEL_OPTIONS: {
  id: OverlayPanelVisibilityKey;
  label: string;
}[] = [
  { id: "standings", label: "Classement" },
  { id: "timing", label: "Chronos" },
  { id: "trackmap", label: "Circuit" },
  { id: "relative", label: "Relatif" },
  { id: "strategy", label: "Stratégie" },
  { id: "boxCall", label: "Radio" },
  { id: "hud", label: "ATH" },
];

export const OVERLAY_LAYOUT_PANEL_IDS: OverlayPanelVisibilityKey[] = [
  "standings",
  "timing",
  "trackmap",
  "relative",
  "strategy",
  "boxCall",
  "hud",
];

export type RadioHotkeyId =
  | "radioKeyCopy"
  | "radioKeyYes"
  | "radioKeyNo"
  | "radioKeyFullPush";

export const RADIO_HOTKEY_OPTIONS: {
  id: RadioHotkeyId;
  label: string;
  message: string;
}[] = [
  { id: "radioKeyCopy", label: "Copy", message: "Copy" },
  { id: "radioKeyYes", label: "Yes", message: "Yes" },
  { id: "radioKeyNo", label: "No", message: "No" },
  {
    id: "radioKeyFullPush",
    label: "No Risk, Full Push",
    message: "No Risk, Full Push",
  },
];

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function clampPercent(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(95, Math.max(0, Math.round(n * 10) / 10));
}

function clampScale(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(2, Math.max(0.5, Math.round(n * 100) / 100));
}

function normalizePosition(
  value: unknown,
  fallback: OverlayPanelPosition,
): OverlayPanelPosition {
  if (!value || typeof value !== "object") return { ...fallback };
  const raw = value as Partial<OverlayPanelPosition>;
  return {
    x: clampPercent(raw.x, fallback.x),
    y: clampPercent(raw.y, fallback.y),
    scale: clampScale(raw.scale, fallback.scale),
  };
}

export function normalizeOverlayLayout(
  input: Partial<OverlayPanelLayout> | null | undefined,
): OverlayPanelLayout {
  const raw = input ?? {};
  const next = {} as OverlayPanelLayout;
  for (const id of OVERLAY_LAYOUT_PANEL_IDS) {
    next[id] = normalizePosition(raw[id], DEFAULT_OVERLAY_LAYOUT[id]);
  }
  return next;
}

function normalizeKeyCode(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") return fallback;
  return value.trim();
}

/** Affichage lisible d'un KeyboardEvent.code. */
export function formatKeyCode(code: string): string {
  if (!code) return "—";
  if (code.startsWith("Joystick:")) {
    const button = code.match(/:Button:(\d+)$/);
    if (button) return `Volant B${Number(button[1]) + 1}`;
    const hat = code.match(/:Hat:(\d+):([a-z-]+)$/i);
    if (hat) return `Volant hat ${Number(hat[1]) + 1} ${hat[2]}`;
    const axis = code.match(/:Axis:(\d+):(-?1)$/);
    if (axis) {
      return `Volant axe ${Number(axis[1]) + 1} ${axis[2] === "-1" ? "−" : "+"}`;
    }
    return "Volant";
  }
  if (code.startsWith("Gamepad:")) {
    const axis = code.match(/:Axis:(\d+):(-?1)$/);
    if (axis) {
      return `Volant axe ${Number(axis[1]) + 1} ${axis[2] === "-1" ? "−" : "+"}`;
    }
    const button = code.match(/(?::Button)?:([0-9]+)$/);
    return button ? `Volant B${Number(button[1]) + 1}` : "Volant";
  }
  if (code.startsWith("Key") && code.length === 4) return code.slice(3);
  if (code.startsWith("Digit") && code.length === 6) return code.slice(5);
  if (code.startsWith("Numpad") && code.length > 6) return `Num ${code.slice(6)}`;
  if (code.startsWith("F") && /^F\d{1,2}$/.test(code)) return code;
  const map: Record<string, string> = {
    Space: "Espace",
    Enter: "Entrée",
    Escape: "Échap",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    ShiftLeft: "Shift",
    ShiftRight: "Shift",
    ControlLeft: "Ctrl",
    ControlRight: "Ctrl",
    AltLeft: "Alt",
    AltRight: "Alt",
  };
  return map[code] ?? code;
}

export function normalizeOverlayPrefs(
  input: Partial<OverlayPanelPrefs> | null | undefined,
): OverlayPanelPrefs {
  const raw = input ?? {};
  return {
    standings: raw.standings ?? DEFAULT_OVERLAY_PREFS.standings,
    timing: raw.timing ?? DEFAULT_OVERLAY_PREFS.timing,
    trackmap: raw.trackmap ?? DEFAULT_OVERLAY_PREFS.trackmap,
    relative: raw.relative ?? DEFAULT_OVERLAY_PREFS.relative,
    strategy: raw.strategy ?? DEFAULT_OVERLAY_PREFS.strategy,
    boxCall: raw.boxCall ?? DEFAULT_OVERLAY_PREFS.boxCall,
    hud: raw.hud ?? DEFAULT_OVERLAY_PREFS.hud,
    layout: normalizeOverlayLayout(raw.layout),
    standingsTopN: clampInt(
      raw.standingsTopN,
      1,
      20,
      DEFAULT_OVERLAY_PREFS.standingsTopN,
    ),
    standingsAhead: clampInt(
      raw.standingsAhead,
      0,
      10,
      DEFAULT_OVERLAY_PREFS.standingsAhead,
    ),
    standingsBehind: clampInt(
      raw.standingsBehind,
      0,
      10,
      DEFAULT_OVERLAY_PREFS.standingsBehind,
    ),
    standingsShowOtherClasses:
      raw.standingsShowOtherClasses ??
      DEFAULT_OVERLAY_PREFS.standingsShowOtherClasses,
    timingRecentLaps: clampInt(
      raw.timingRecentLaps,
      1,
      15,
      DEFAULT_OVERLAY_PREFS.timingRecentLaps,
    ),
    relativeAhead: clampInt(
      raw.relativeAhead,
      0,
      10,
      DEFAULT_OVERLAY_PREFS.relativeAhead,
    ),
    relativeBehind: clampInt(
      raw.relativeBehind,
      0,
      10,
      DEFAULT_OVERLAY_PREFS.relativeBehind,
    ),
    radioKeyCopy: normalizeKeyCode(
      raw.radioKeyCopy,
      DEFAULT_OVERLAY_PREFS.radioKeyCopy,
    ),
    radioKeyYes: normalizeKeyCode(
      raw.radioKeyYes,
      DEFAULT_OVERLAY_PREFS.radioKeyYes,
    ),
    radioKeyNo: normalizeKeyCode(
      raw.radioKeyNo,
      DEFAULT_OVERLAY_PREFS.radioKeyNo,
    ),
    radioKeyFullPush: normalizeKeyCode(
      raw.radioKeyFullPush,
      DEFAULT_OVERLAY_PREFS.radioKeyFullPush,
    ),
  };
}
