import { useEffect } from "react";
import {
  RADIO_HOTKEY_OPTIONS,
  type OverlayPanelPrefs,
} from "../types/overlayPrefs";
import {
  bindingMatchesGamepad,
  createGamepadInputState,
  isAxisActive,
  listGamepads,
  parseGamepadBinding,
  seedGamepadInputState,
} from "../utils/gamepadHotkeys";

/** Lecture volant dans le launcher, qui a autorisé/capturé le périphérique. */
export function useRadioControllerHotkeys(prefs: OverlayPanelPrefs): void {
  useEffect(() => {
    if (!prefs.boxCall) return;
    const bindings = RADIO_HOTKEY_OPTIONS.flatMap((option) => {
      const binding = parseGamepadBinding(prefs[option.id]);
      return binding ? [{ option, binding }] : [];
    });
    if (bindings.length === 0) return;

    const previous = createGamepadInputState();
    seedGamepadInputState(previous);
    let ready = false;
    const timer = window.setInterval(() => {
      if (!ready) {
        seedGamepadInputState(previous);
        ready = true;
        return;
      }

      for (const pad of listGamepads()) {
        for (const { option, binding } of bindings) {
          if (!bindingMatchesGamepad(binding, pad)) continue;

          let active = false;
          let wasActive = false;
          if (binding.kind === "button") {
            const key = `${pad.index}:button:${binding.button}`;
            const button = pad.buttons[binding.button];
            active =
              button?.pressed === true || (button?.value ?? 0) >= 0.55;
            wasActive = previous.buttons.get(key) === true;
            previous.buttons.set(key, active);
          } else {
            const key = `${pad.index}:axis:${binding.axis}:${binding.direction}`;
            const value = pad.axes[binding.axis] ?? 0;
            wasActive = previous.buttons.get(key) === true;
            active = isAxisActive(value, binding.direction, wasActive);
            previous.buttons.set(key, active);
          }

          if (active && !wasActive) {
            void window.ath?.overlay?.triggerRadioHotkey?.(option.id);
          }
        }
      }
    }, 25);

    return () => window.clearInterval(timer);
  }, [prefs]);
}
