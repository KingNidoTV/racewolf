import type { RadioHotkeyId } from "../src/types/overlayPrefs";
import { RADIO_HOTKEY_OPTIONS } from "../src/types/overlayPrefs";
import type { OverlayPanelPrefs } from "../src/types/overlayPrefs";

type SdlModule = typeof import("@kmamal/sdl");
type JoystickDevice = SdlModule["joystick"]["devices"][number];
type JoystickInstance = ReturnType<SdlModule["joystick"]["openDevice"]>;

export interface WheelInputHit {
  code: string;
  label: string;
}

type RadioHandler = (hotkeyId: RadioHotkeyId, message: string) => void;

const AXIS_ON = 0.7;
const AXIS_OFF = 0.45;
/** Ignore les faux appuis volant au démarrage SDL (~600 ms). */
const BINDINGS_GRACE_MS = 600;
/** Délai avant d’armer les raccourcis volant après activation. */
const BINDINGS_ARM_MS = 1200;

function encodeButton(guid: string, button: number): string {
  return `Joystick:${encodeURIComponent(guid)}:Button:${button}`;
}

function encodeHat(guid: string, hat: number, direction: string): string {
  return `Joystick:${encodeURIComponent(guid)}:Hat:${hat}:${direction}`;
}

function encodeAxis(guid: string, axis: number, direction: -1 | 1): string {
  return `Joystick:${encodeURIComponent(guid)}:Axis:${axis}:${direction}`;
}

export function parseJoystickBinding(code: string): {
  guid: string;
  kind: "button" | "hat" | "axis";
  index: number;
  direction?: string | -1 | 1;
} | null {
  if (!code.startsWith("Joystick:")) return null;
  try {
    const button = code.match(/^Joystick:(.*):Button:(\d+)$/);
    if (button) {
      return {
        guid: decodeURIComponent(button[1]),
        kind: "button",
        index: Number(button[2]),
      };
    }
    const hat = code.match(/^Joystick:(.*):Hat:(\d+):([a-z-]+)$/i);
    if (hat) {
      return {
        guid: decodeURIComponent(hat[1]),
        kind: "hat",
        index: Number(hat[2]),
        direction: hat[3].toLowerCase(),
      };
    }
    const axis = code.match(/^Joystick:(.*):Axis:(\d+):(-?1)$/);
    if (axis) {
      return {
        guid: decodeURIComponent(axis[1]),
        kind: "axis",
        index: Number(axis[2]),
        direction: Number(axis[3]) as -1 | 1,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function prefsHasJoystickBindings(
  prefs: OverlayPanelPrefs | null | undefined,
): boolean {
  if (!prefs?.boxCall) return false;
  return RADIO_HOTKEY_OPTIONS.some((opt) =>
    Boolean(parseJoystickBinding(prefs[opt.id])),
  );
}

function isAxisActive(
  value: number,
  direction: -1 | 1,
  wasActive: boolean,
): boolean {
  if (direction < 0) {
    return wasActive ? value <= -AXIS_OFF : value <= -AXIS_ON;
  }
  return wasActive ? value >= AXIS_OFF : value >= AXIS_ON;
}

/**
 * Lecture DirectInput/SDL des volants (MOZA, Fanatec, GSI…).
 * Ouverture paresseuse : n’ouvre les périphériques que si nécessaire
 * (binding radio ou capture) pour ne pas voler le FFB à iRacing.
 */
export class WheelInputService {
  private sdl: SdlModule | null = null;
  private loadError: string | null = null;
  private open = new Map<string, { device: JoystickDevice; joy: JoystickInstance }>();
  private prevButtons = new Map<string, boolean>();
  private prevHats = new Map<string, string>();
  private prevAxes = new Map<string, number>();
  private axisActive = new Map<string, boolean>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private listenResolve: ((hit: WheelInputHit) => void) | null = null;
  private listenReject: ((err: Error) => void) | null = null;
  private primed = false;
  private handler: RadioHandler | null = null;
  private listenMode = false;
  private requiredGuids = new Set<string>();
  private bindings: {
    id: RadioHotkeyId;
    message: string;
    binding: NonNullable<ReturnType<typeof parseJoystickBinding>>;
  }[] = [];
  private bindingsGraceUntil = 0;
  private bindingsArmUntil = 0;
  private bindingsReleased = new Set<RadioHotkeyId>();

  /** Démarre le polling uniquement si bindings volant ou capture active. */
  syncRuntime(prefs?: OverlayPanelPrefs | null): void {
    if (prefs !== undefined) {
      this.syncBindings(prefs);
    }
    const needPolling = this.listenMode || this.bindings.length > 0;
    if (needPolling) {
      this.startPolling();
    } else {
      this.stopPolling();
    }
  }

  private startPolling(): void {
    if (this.timer) {
      this.refreshDevices();
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.sdl = require("@kmamal/sdl") as SdlModule;
      this.loadError = null;
    } catch (err) {
      this.loadError =
        err instanceof Error ? err.message : "SDL joystick indisponible";
      console.warn("[RaceWolf] WheelInput SDL:", this.loadError);
      return;
    }
    this.refreshDevices();
    this.primed = false;
    this.bindingsGraceUntil = Date.now() + BINDINGS_GRACE_MS;
    this.bindingsArmUntil = Date.now() + BINDINGS_ARM_MS;
    this.bindingsReleased.clear();
    this.timer = setInterval(() => this.tick(), 25);
  }

  stop(): void {
    this.cancelListen();
    this.stopPolling();
  }

  private stopPolling(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    for (const { joy } of this.open.values()) {
      try {
        joy.close();
      } catch {
        /* ignore */
      }
    }
    this.open.clear();
    this.primed = false;
    this.bindingsGraceUntil = 0;
    this.bindingsArmUntil = 0;
    this.bindingsReleased.clear();
  }

  /** @deprecated Utiliser syncRuntime — conservé pour compat interne. */
  start(): void {
    this.startPolling();
  }

  getStatus(): { ok: boolean; devices: string[]; error: string | null } {
    return {
      ok: Boolean(this.sdl),
      devices: [...this.open.values()]
        .map((x) => x.device.name)
        .filter((name): name is string => Boolean(name)),
      error: this.loadError,
    };
  }

  setRadioHandler(handler: RadioHandler | null): void {
    this.handler = handler;
  }

  syncBindings(prefs: OverlayPanelPrefs | null | undefined): void {
    this.bindings = [];
    this.requiredGuids.clear();
    this.bindingsReleased.clear();
    if (!prefs?.boxCall) return;
    for (const opt of RADIO_HOTKEY_OPTIONS) {
      const binding = parseJoystickBinding(prefs[opt.id]);
      if (!binding) continue;
      this.bindings.push({
        id: opt.id,
        message: opt.message,
        binding,
      });
      this.requiredGuids.add(binding.guid);
    }
  }

  listenForNextInput(timeoutMs = 20000): Promise<WheelInputHit> {
    this.cancelListen();
    this.listenMode = true;
    this.syncRuntime();
    this.primed = false;
    this.snapshotAll();
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.listenResolve = null;
        this.listenReject = null;
        this.endListen();
        reject(new Error("Délai dépassé — réessayez"));
      }, timeoutMs);

      this.listenResolve = (hit) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.listenResolve = null;
        this.listenReject = null;
        this.endListen();
        resolve(hit);
      };
      this.listenReject = (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.listenResolve = null;
        this.listenReject = null;
        this.endListen();
        reject(err);
      };
    });
  }

  cancelListen(): void {
    if (this.listenReject) {
      try {
        this.listenReject(new Error("cancelled"));
      } catch {
        /* ignore */
      }
    }
    this.listenResolve = null;
    this.listenReject = null;
    this.endListen();
  }

  private endListen(): void {
    if (!this.listenMode) return;
    this.listenMode = false;
    this.syncRuntime();
  }

  private refreshDevices(): void {
    if (!this.sdl) return;
    const devices = this.sdl.joystick.devices;
    const seen = new Set<string>();
    const openAll = this.listenMode;

    for (const device of devices) {
      const guid = String(device.guid || device.id);
      seen.add(guid);
      if (!openAll && !this.requiredGuids.has(guid)) continue;
      if (this.open.has(guid)) continue;
      try {
        const joy = this.sdl.joystick.openDevice(device);
        this.open.set(guid, { device, joy });
      } catch (err) {
        console.warn("[RaceWolf] open joystick", device.name, err);
      }
    }

    for (const [guid, entry] of this.open) {
      if (!seen.has(guid)) {
        try {
          entry.joy.close();
        } catch {
          /* ignore */
        }
        this.open.delete(guid);
        continue;
      }
      if (!openAll && !this.requiredGuids.has(guid)) {
        try {
          entry.joy.close();
        } catch {
          /* ignore */
        }
        this.open.delete(guid);
      }
    }
  }

  private snapshotAll(): void {
    this.refreshDevices();
    for (const [guid, { joy }] of this.open) {
      const buttons = joy.buttons;
      for (let i = 0; i < buttons.length; i++) {
        this.prevButtons.set(`${guid}:b:${i}`, Boolean(buttons[i]));
      }
      const hats = joy.hats as string[];
      for (let i = 0; i < hats.length; i++) {
        this.prevHats.set(`${guid}:h:${i}`, String(hats[i] ?? "centered"));
      }
      const axes = joy.axes as number[];
      for (let i = 0; i < axes.length; i++) {
        this.prevAxes.set(`${guid}:a:${i}`, Number(axes[i] ?? 0));
        this.axisActive.set(`${guid}:a:${i}:+`, false);
        this.axisActive.set(`${guid}:a:${i}:-`, false);
      }
    }
  }

  private tick(): void {
    if (!this.sdl) return;
    try {
      this.refreshDevices();
    } catch {
      return;
    }

    if (!this.primed) {
      this.snapshotAll();
      this.primed = true;
      return;
    }

    const hit = this.scanPress();
    if (hit && this.listenResolve) {
      const resolve = this.listenResolve;
      this.listenResolve = null;
      this.listenReject = null;
      resolve(hit);
      this.snapshotAll();
      return;
    }

    if (this.bindings.length > 0 && this.handler) {
      this.scanBindings();
    }
  }

  private scanPress(): WheelInputHit | null {
    for (const [guid, { device, joy }] of this.open) {
      const buttons = joy.buttons;
      for (let i = 0; i < buttons.length; i++) {
        const key = `${guid}:b:${i}`;
        const pressed = Boolean(buttons[i]);
        const was = this.prevButtons.get(key) === true;
        this.prevButtons.set(key, pressed);
        if (pressed && !was) {
          return {
            code: encodeButton(guid, i),
            label: `${device.name} — bouton ${i + 1}`,
          };
        }
      }
    }

    for (const [guid, { device, joy }] of this.open) {
      const hats = joy.hats as string[];
      for (let i = 0; i < hats.length; i++) {
        const key = `${guid}:h:${i}`;
        const value = String(hats[i] ?? "centered").toLowerCase();
        const prev = this.prevHats.get(key) ?? "centered";
        this.prevHats.set(key, value);
        if (
          value !== "centered" &&
          value !== prev &&
          value !== "left-up" &&
          value !== "right-up" &&
          value !== "left-down" &&
          value !== "right-down"
        ) {
          // directions cardinales uniquement pour un binding clair
        }
        if (value !== "centered" && prev === "centered") {
          return {
            code: encodeHat(guid, i, value),
            label: `${device.name} — hat ${i + 1} ${value}`,
          };
        }
        if (
          value !== "centered" &&
          value !== prev &&
          prev !== "centered"
        ) {
          return {
            code: encodeHat(guid, i, value),
            label: `${device.name} — hat ${i + 1} ${value}`,
          };
        }
      }
    }

    for (const [guid, { device, joy }] of this.open) {
      const skipAxis0 = device.type === "wheel";
      const axes = joy.axes as number[];
      for (let i = 0; i < axes.length; i++) {
        if (skipAxis0 && i === 0) {
          this.prevAxes.set(`${guid}:a:${i}`, Number(axes[i] ?? 0));
          continue;
        }
        const key = `${guid}:a:${i}`;
        const value = Number(axes[i] ?? 0);
        const prev = this.prevAxes.has(key)
          ? (this.prevAxes.get(key) as number)
          : value;
        this.prevAxes.set(key, value);
        const delta = value - prev;

        if (value >= AXIS_ON && prev < AXIS_ON) {
          return {
            code: encodeAxis(guid, i, 1),
            label: `${device.name} — axe ${i + 1} +`,
          };
        }
        if (value <= -AXIS_ON && prev > -AXIS_ON) {
          return {
            code: encodeAxis(guid, i, -1),
            label: `${device.name} — axe ${i + 1} −`,
          };
        }
        if (Math.abs(delta) >= 0.55 && Math.abs(value) >= 0.4) {
          const direction: -1 | 1 = delta > 0 ? 1 : -1;
          return {
            code: encodeAxis(guid, i, direction),
            label: `${device.name} — axe ${i + 1} ${direction < 0 ? "−" : "+"}`,
          };
        }
      }
    }

    return null;
  }

  private scanBindings(): void {
    const now = Date.now();
    const allowFire =
      now >= this.bindingsGraceUntil && now >= this.bindingsArmUntil;

    for (const item of this.bindings) {
      const { binding } = item;
      const entry =
        this.open.get(binding.guid) ??
        [...this.open.values()].find((x) =>
          String(x.device.guid) === binding.guid ||
          String(x.device.id) === binding.guid,
        );
      if (!entry) continue;
      const { joy } = entry;

      let active = false;
      let wasActive = false;
      if (binding.kind === "button") {
        const key = `${binding.guid}:b:${binding.index}`;
        active = Boolean(joy.buttons[binding.index]);
        wasActive = this.prevButtons.get(key) === true;
        this.prevButtons.set(key, active);
      } else if (binding.kind === "hat") {
        const key = `${binding.guid}:h:${binding.index}`;
        const value = String(
          (joy.hats as string[])[binding.index] ?? "centered",
        ).toLowerCase();
        active = value === String(binding.direction).toLowerCase();
        wasActive = this.prevHats.get(`bind:${key}`) === "1";
        this.prevHats.set(`bind:${key}`, active ? "1" : "0");
      } else if (binding.kind === "axis" && binding.direction != null) {
        const key = `${binding.guid}:a:${binding.index}:${binding.direction}`;
        const value = Number((joy.axes as number[])[binding.index] ?? 0);
        wasActive = this.axisActive.get(key) === true;
        active = isAxisActive(
          value,
          binding.direction as -1 | 1,
          wasActive,
        );
        this.axisActive.set(key, active);
      }

      if (!active) {
        this.bindingsReleased.add(item.id);
      }

      if (
        allowFire &&
        this.bindingsReleased.has(item.id) &&
        active &&
        !wasActive
      ) {
        this.handler?.(item.id, item.message);
      }
    }
  }
}

export const wheelInput = new WheelInputService();
