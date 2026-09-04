/** Drapeaux piste globaux (irsdk_Flags — SessionFlags). */
export const IRSDK_CHECKERED = 0x0000_0001;
export const IRSDK_WHITE = 0x0000_0002;
export const IRSDK_GREEN = 0x0000_0004;
export const IRSDK_YELLOW = 0x0000_0008;
export const IRSDK_RED = 0x0000_0010;
export const IRSDK_BLUE = 0x0000_0020;
export const IRSDK_DEBRIS = 0x0000_0040;
export const IRSDK_CROSSED = 0x0000_0080;
export const IRSDK_YELLOW_WAVING = 0x0000_0100;
export const IRSDK_ONE_LAP_TO_GREEN = 0x0000_0200;
export const IRSDK_GREEN_HELD = 0x0000_0400;
export const IRSDK_TEN_TO_GO = 0x0000_0800;
export const IRSDK_FIVE_TO_GO = 0x0000_1000;
export const IRSDK_CAUTION = 0x0000_4000;
export const IRSDK_CAUTION_WAVING = 0x0000_8000;
export const IRSDK_BLACK = 0x0001_0000;
export const IRSDK_DISQUALIFY = 0x0002_0000;
export const IRSDK_FURLED = 0x0008_0000;
export const IRSDK_START_GO = 0x8000_0000;

export type TrackFlagKind =
  | "checkered"
  | "red"
  | "yellow-waving"
  | "yellow"
  | "caution"
  | "one-lap-green"
  | "green"
  | "white"
  | "blue"
  | "black"
  | "surface"
  | "start";

export interface TrackFlagState {
  kind: TrackFlagKind;
  label: string;
}

const LABELS: Record<TrackFlagKind, string> = {
  checkered: "Drapeau à damier",
  red: "Drapeau rouge",
  "yellow-waving": "Drapeau jaune agité",
  yellow: "Drapeau jaune",
  caution: "Safety car",
  "one-lap-green": "1 tour avant le vert",
  green: "Drapeau vert",
  white: "Drapeau blanc",
  blue: "Drapeau bleu",
  black: "Drapeau noir",
  surface: "Changement d’adhérence",
  start: "Départ",
};

/** Drapeaux affichables dans la barre piste, y compris alertes au joueur. */
const TRACK_MASK =
  IRSDK_CHECKERED |
  IRSDK_WHITE |
  IRSDK_GREEN |
  IRSDK_YELLOW |
  IRSDK_RED |
  IRSDK_BLUE |
  IRSDK_DEBRIS |
  IRSDK_CROSSED |
  IRSDK_YELLOW_WAVING |
  IRSDK_ONE_LAP_TO_GREEN |
  IRSDK_GREEN_HELD |
  IRSDK_TEN_TO_GO |
  IRSDK_FIVE_TO_GO |
  IRSDK_CAUTION |
  IRSDK_CAUTION_WAVING |
  IRSDK_BLACK |
  IRSDK_DISQUALIFY |
  IRSDK_FURLED |
  IRSDK_START_GO;

export function resolveTrackFlag(sessionFlags: number): TrackFlagState | null {
  const flags = sessionFlags & TRACK_MASK;
  if (!flags) return null;

  let kind: TrackFlagKind | null = null;

  if (flags & IRSDK_CHECKERED) kind = "checkered";
  else if (flags & IRSDK_RED) kind = "red";
  else if (flags & (IRSDK_BLACK | IRSDK_DISQUALIFY | IRSDK_FURLED))
    kind = "black";
  else if (flags & (IRSDK_CAUTION_WAVING | IRSDK_YELLOW_WAVING))
    kind = "yellow-waving";
  else if (flags & IRSDK_DEBRIS) kind = "surface";
  else if (flags & (IRSDK_CAUTION | IRSDK_YELLOW)) kind = "yellow";
  else if (flags & IRSDK_ONE_LAP_TO_GREEN) kind = "one-lap-green";
  else if (flags & IRSDK_START_GO) kind = "start";
  else if (flags & IRSDK_GREEN) kind = "green";
  else if (flags & IRSDK_WHITE) kind = "white";
  else if (flags & IRSDK_BLUE) kind = "blue";

  if (!kind) return null;

  return {
    kind,
    label: LABELS[kind],
  };
}
