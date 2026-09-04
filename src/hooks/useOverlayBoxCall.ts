import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_BOX_CALL,
  type BoxCallState,
  type RadioPresetId,
} from "../endurance/collaboration/types";

/** État radio partagé (overlay + endurance) + envoi / clear. */
export function useOverlayBoxCall(_prefs?: unknown) {
  const [boxCall, setBoxCall] = useState<BoxCallState>(DEFAULT_BOX_CALL);

  useEffect(() => {
    void window.ath?.boxCall?.get?.().then(setBoxCall);
    return window.ath?.boxCall?.onChange?.(setBoxCall);
  }, []);

  const clear = useCallback(() => {
    if (window.ath?.boxCall?.set) {
      void window.ath.boxCall
        .set({ active: false, message: null, preset: null })
        .then(setBoxCall);
      return;
    }
    setBoxCall(DEFAULT_BOX_CALL);
  }, []);

  const send = useCallback(
    (message: string, preset: RadioPresetId | null = "custom") => {
      const trimmed = message.trim();
      if (!trimmed) return;
      if (window.ath?.boxCall?.set) {
        void window.ath.boxCall
          .set({
            active: true,
            message: trimmed,
            preset,
            byName: "Pilote",
          })
          .then(setBoxCall);
        return;
      }
      setBoxCall({
        active: true,
        byUserId: "driver",
        byName: "Pilote",
        at: new Date().toISOString(),
        message: trimmed,
        preset,
      });
    },
    [],
  );

  const toggle = useCallback(() => {
    if (boxCall.active) {
      clear();
      return;
    }
    if (window.ath?.boxCall?.toggle) {
      void window.ath.boxCall.toggle().then(setBoxCall);
      return;
    }
    send("Box in this lap", "box");
  }, [boxCall.active, clear, send]);

  return { boxCall, toggle, send, clear };
}
