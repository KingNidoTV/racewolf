import { globalShortcut } from "electron";
import {
  RADIO_HOTKEY_OPTIONS,
  type OverlayPanelPrefs,
  type RadioHotkeyId,
} from "../src/types/overlayPrefs";
import { parseJoystickBinding } from "./wheelInput";

type RadioHandler = (hotkeyId: RadioHotkeyId, message: string) => void;

type SdlKeyboard = {
  getScancode: (key: string) => number;
  getState: () => boolean[] | Uint8Array;
};

/** Convertit un KeyboardEvent.code en accélérateur Electron (legacy / affichage). */
export function codeToAccelerator(code: string): string | null {
  const c = code.trim();
  if (!c) return null;

  if (/^Key[A-Z]$/i.test(c)) return c.slice(3).toUpperCase();
  if (/^Digit[0-9]$/.test(c)) return c.slice(5);
  if (/^Numpad[0-9]$/.test(c)) return `num${c.slice(6)}`;
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(c)) return c.toUpperCase();

  const map: Record<string, string> = {
    Space: "Space",
    Enter: "Enter",
    Tab: "Tab",
    Backspace: "Backspace",
    Delete: "Delete",
    Insert: "Insert",
    Home: "Home",
    End: "End",
    PageUp: "PageUp",
    PageDown: "PageDown",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    Minus: "-",
    Equal: "=",
    BracketLeft: "[",
    BracketRight: "]",
    Backslash: "\\",
    Semicolon: ";",
    Quote: "'",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Backquote: "`",
    NumpadAdd: "numadd",
    NumpadSubtract: "numsub",
    NumpadMultiply: "nummult",
    NumpadDivide: "numdiv",
    NumpadDecimal: "numdec",
    NumpadEnter: "Enter",
  };
  return map[c] ?? null;
}

/** KeyboardEvent.code → nom de touche SDL (@kmamal/sdl). */
function codeToSdlKey(code: string): string | null {
  const c = code.trim();
  if (!c || c.startsWith("Joystick:")) return null;

  if (/^Key[A-Z]$/i.test(c)) return c.slice(3).toLowerCase();
  if (/^Digit[0-9]$/.test(c)) return c.slice(5);
  if (/^Numpad[0-9]$/.test(c)) return `kp${c.slice(6)}`;
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(c)) return c.toLowerCase();

  const map: Record<string, string> = {
    Space: "space",
    Enter: "return",
    Tab: "tab",
    Backspace: "backspace",
    Delete: "delete",
    Insert: "insert",
    Home: "home",
    End: "end",
    PageUp: "pageUp",
    PageDown: "pageDown",
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    Escape: "escape",
    Minus: "-",
    Equal: "=",
    BracketLeft: "[",
    BracketRight: "]",
    Backslash: "\\",
    Semicolon: ";",
    Quote: "'",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Backquote: "`",
    NumpadAdd: "kpPlus",
    NumpadSubtract: "kpMinus",
    NumpadMultiply: "kpMultiply",
    NumpadDivide: "kpDivide",
    NumpadDecimal: "kpPeriod",
    NumpadEnter: "kpEnter",
  };
  return map[c] ?? null;
}

let activeHandler: RadioHandler | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let sdlKeyboard: SdlKeyboard | null = null;
let loadErrorLogged = false;
let armUntil = 0;

const bindings: {
  id: RadioHotkeyId;
  message: string;
  scancode: number;
}[] = [];
const prevDown = new Map<number, boolean>();
const released = new Set<RadioHotkeyId>();

const POLL_MS = 25;
const ARM_MS = 800;

function ensureSdlKeyboard(): SdlKeyboard | null {
  if (sdlKeyboard) return sdlKeyboard;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sdl = require("@kmamal/sdl") as { keyboard: SdlKeyboard };
    sdlKeyboard = sdl.keyboard;
    return sdlKeyboard;
  } catch (err) {
    if (!loadErrorLogged) {
      loadErrorLogged = true;
      console.warn(
        "[RaceWolf] Clavier SDL indisponible — raccourcis radio clavier désactivés:",
        err instanceof Error ? err.message : err,
      );
    }
    return null;
  }
}

function stopPoll(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  bindings.length = 0;
  prevDown.clear();
  released.clear();
  armUntil = 0;
}

function tick(): void {
  const kb = ensureSdlKeyboard();
  if (!kb || !activeHandler || bindings.length === 0) return;

  let state: boolean[] | Uint8Array;
  try {
    state = kb.getState();
  } catch {
    return;
  }

  const armed = Date.now() >= armUntil;

  for (const item of bindings) {
    const down = Boolean(state[item.scancode]);
    const was = prevDown.get(item.scancode) === true;
    prevDown.set(item.scancode, down);

    if (!down) {
      released.add(item.id);
      continue;
    }

    if (armed && released.has(item.id) && down && !was) {
      activeHandler(item.id, item.message);
    }
  }
}

/**
 * Écoute les raccourcis radio sans les « voler » au système
 * (contrairement à Electron globalShortcut) : le chat iRacing et le reste
 * du clavier restent utilisables.
 */
export function unregisterRadioHotkeys(): void {
  activeHandler = null;
  stopPoll();
  // Nettoie d’anciennes sessions qui utilisaient encore globalShortcut.
  try {
    globalShortcut.unregisterAll();
  } catch {
    /* ignore */
  }
}

export function syncRadioHotkeys(
  prefs: OverlayPanelPrefs | null | undefined,
  onTrigger: RadioHandler,
): void {
  unregisterRadioHotkeys();
  activeHandler = onTrigger;

  if (!prefs?.boxCall) return;

  const kb = ensureSdlKeyboard();
  if (!kb) return;

  const used = new Set<number>();

  for (const opt of RADIO_HOTKEY_OPTIONS) {
    const code = prefs[opt.id];
    if (!code || parseJoystickBinding(code)) continue;

    const sdlKey = codeToSdlKey(code);
    if (!sdlKey) continue;

    let scancode: number;
    try {
      scancode = kb.getScancode(sdlKey);
    } catch {
      console.warn("[RaceWolf] Touche radio inconnue:", code, sdlKey);
      continue;
    }
    if (!Number.isInteger(scancode) || used.has(scancode)) continue;
    used.add(scancode);
    bindings.push({ id: opt.id, message: opt.message, scancode });
    prevDown.set(scancode, false);
    released.add(opt.id);
  }

  if (bindings.length === 0) return;

  armUntil = Date.now() + ARM_MS;
  pollTimer = setInterval(tick, POLL_MS);
}
