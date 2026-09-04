const PREFIX = "Gamepad:";

export type GamepadBinding =
  | {
      deviceId: string;
      kind: "button";
      button: number;
    }
  | {
      deviceId: string;
      kind: "axis";
      axis: number;
      direction: -1 | 1;
    };

export interface GamepadInputState {
  buttons: Map<string, boolean>;
  axes: Map<string, number>;
}

/** Engagement franc d’un axe (stick / hat). */
const AXIS_ON = 0.7;
/** Relâchement sous ce seuil (hystérésis). */
const AXIS_OFF = 0.45;
/** Variation mini pour capturer un « bouton sur axe » (ex. repos à -1 → appui à +1). */
const AXIS_SNAP = 0.55;
const BUTTON_ACTIVATE = 0.55;

export function createGamepadInputState(): GamepadInputState {
  return { buttons: new Map(), axes: new Map() };
}

/** Mémorise la position actuelle sans déclencher de binding. */
export function seedGamepadInputState(state: GamepadInputState): void {
  for (const pad of listGamepads()) {
    for (let index = 0; index < pad.buttons.length; index++) {
      const button = pad.buttons[index];
      const pressed =
        button?.pressed === true || (button?.value ?? 0) >= BUTTON_ACTIVATE;
      state.buttons.set(`${pad.index}:${index}`, pressed);
    }
    for (let index = 0; index < pad.axes.length; index++) {
      state.axes.set(`${pad.index}:${index}`, pad.axes[index] ?? 0);
    }
  }
}

export function encodeGamepadButton(
  deviceId: string,
  button: number,
): string {
  return `${PREFIX}${encodeURIComponent(deviceId)}:Button:${button}`;
}

export function encodeGamepadAxis(
  deviceId: string,
  axis: number,
  direction: -1 | 1,
): string {
  return `${PREFIX}${encodeURIComponent(deviceId)}:Axis:${axis}:${direction}`;
}

export function parseGamepadBinding(code: string): GamepadBinding | null {
  if (!code.startsWith(PREFIX)) return null;

  try {
    const axisMatch = code.match(/^Gamepad:(.*):Axis:(\d+):(-?1)$/);
    if (axisMatch) {
      return {
        deviceId: decodeURIComponent(axisMatch[1]),
        kind: "axis",
        axis: Number(axisMatch[2]),
        direction: Number(axisMatch[3]) as -1 | 1,
      };
    }

    const buttonMatch = code.match(/^Gamepad:(.*):Button:(\d+)$/);
    if (buttonMatch) {
      return {
        deviceId: decodeURIComponent(buttonMatch[1]),
        kind: "button",
        button: Number(buttonMatch[2]),
      };
    }

    const legacyMatch = code.match(/^Gamepad:(.*):(\d+)$/);
    if (legacyMatch) {
      return {
        deviceId: decodeURIComponent(legacyMatch[1]),
        kind: "button",
        button: Number(legacyMatch[2]),
      };
    }
  } catch {
    // binding invalide
  }
  return null;
}

export function listGamepads(): Gamepad[] {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return [];
  return Array.from(navigator.getGamepads()).filter(
    (pad): pad is Gamepad => pad != null && pad.connected,
  );
}

export function bindingMatchesGamepad(
  binding: GamepadBinding,
  pad: Gamepad,
): boolean {
  if (pad.id === binding.deviceId) return true;
  return listGamepads().length === 1;
}

/** Axe engagé dans une direction (avec hystérésis via previous). */
export function isAxisActive(
  value: number,
  direction: -1 | 1,
  wasActive: boolean,
): boolean {
  if (direction < 0) {
    if (wasActive) return value <= -AXIS_OFF;
    return value <= -AXIS_ON;
  }
  if (wasActive) return value >= AXIS_OFF;
  return value >= AXIS_ON;
}

/**
 * Capture : détecte un appui bouton, ou un mouvement d’axe volontaire.
 * Gère aussi les « boutons » branchés en axe (repos souvent à -1).
 * Les boutons restent prioritaires.
 */
export function pressedGamepadControl(
  previous: GamepadInputState,
): { code: string; label: string } | null {
  for (const pad of listGamepads()) {
    for (let index = 0; index < pad.buttons.length; index++) {
      const key = `${pad.index}:${index}`;
      const button = pad.buttons[index];
      const pressed =
        button?.pressed === true || (button?.value ?? 0) >= BUTTON_ACTIVATE;
      const wasPressed = previous.buttons.get(key) === true;
      previous.buttons.set(key, pressed);
      if (pressed && !wasPressed) {
        return {
          code: encodeGamepadButton(pad.id, index),
          label: `${pad.id || "Volant"} — bouton ${index + 1}`,
        };
      }
    }
  }

  for (const pad of listGamepads()) {
    for (let index = 0; index < pad.axes.length; index++) {
      const key = `${pad.index}:${index}`;
      const value = pad.axes[index] ?? 0;
      const previousValue = previous.axes.has(key)
        ? (previous.axes.get(key) as number)
        : value;
      previous.axes.set(key, value);

      const delta = value - previousValue;
      if (Math.abs(delta) < 0.08) continue;

      // Stick / hat : passage sous le seuil d’activation.
      const plusEdge = value >= AXIS_ON && previousValue < AXIS_ON;
      const minusEdge = value <= -AXIS_ON && previousValue > -AXIS_ON;
      if (plusEdge) {
        return {
          code: encodeGamepadAxis(pad.id, index, 1),
          label: `${pad.id || "Volant"} — axe ${index + 1} +`,
        };
      }
      if (minusEdge) {
        return {
          code: encodeGamepadAxis(pad.id, index, -1),
          label: `${pad.id || "Volant"} — axe ${index + 1} −`,
        };
      }

      // Bouton-axe : gros saut (ex. -1 → +1 ou 0 → ±1).
      if (Math.abs(delta) >= AXIS_SNAP) {
        const direction: -1 | 1 = delta > 0 ? 1 : -1;
        // Évite de binder le volant pour un micro-mouvement autour de 0.
        if (Math.abs(value) < 0.4 && Math.abs(previousValue) < 0.4) continue;
        return {
          code: encodeGamepadAxis(pad.id, index, direction),
          label: `${pad.id || "Volant"} — axe ${index + 1} ${direction < 0 ? "−" : "+"}`,
        };
      }
    }
  }

  return null;
}
