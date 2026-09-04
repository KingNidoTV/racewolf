import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_OVERLAY_PREFS,
  normalizeOverlayPrefs,
  type OverlayPanelPrefs,
} from "../types/overlayPrefs";

const STORAGE_KEY = "racewolf-overlay-prefs";

function readLocal(): OverlayPanelPrefs {
  if (typeof localStorage === "undefined") return { ...DEFAULT_OVERLAY_PREFS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_OVERLAY_PREFS };
    return normalizeOverlayPrefs(JSON.parse(raw) as Partial<OverlayPanelPrefs>);
  } catch {
    return { ...DEFAULT_OVERLAY_PREFS };
  }
}

function writeLocal(prefs: OverlayPanelPrefs): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function useOverlayPrefs() {
  const [prefs, setPrefs] = useState<OverlayPanelPrefs>(DEFAULT_OVERLAY_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const api = window.ath?.overlay?.getPrefs;
    if (api) {
      void api().then((remote) => {
        if (cancelled) return;
        const next = normalizeOverlayPrefs(remote);
        setPrefs(next);
        writeLocal(next);
        setLoaded(true);
      });
      const unsub = window.ath?.overlay?.onPrefs?.((remote) => {
        const next = normalizeOverlayPrefs(remote);
        setPrefs(next);
        writeLocal(next);
      });
      return () => {
        cancelled = true;
        unsub?.();
      };
    }
    setPrefs(readLocal());
    setLoaded(true);
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePrefs = useCallback(async (patch: Partial<OverlayPanelPrefs>) => {
    setPrefs((prev) => {
      const next = normalizeOverlayPrefs({
        ...prev,
        ...patch,
        layout: patch.layout
          ? { ...prev.layout, ...patch.layout }
          : prev.layout,
      });
      writeLocal(next);
      void window.ath?.overlay?.setPrefs?.(next);
      return next;
    });
  }, []);

  const setAll = useCallback(async (next: OverlayPanelPrefs) => {
    const normalized = normalizeOverlayPrefs(next);
    setPrefs(normalized);
    writeLocal(normalized);
    await window.ath?.overlay?.setPrefs?.(normalized);
  }, []);

  return { prefs, loaded, updatePrefs, setAll };
}
