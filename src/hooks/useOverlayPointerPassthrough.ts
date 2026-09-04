import { useEffect } from "react";

const INTERACTIVE_SELECTOR =
  "[data-ath-interactive], button, a, input, select, textarea, label, [role='button']";

/**
 * L’overlay Electron ignore les clics par défaut (pass-through vers iRacing).
 * On réactive les événements souris uniquement au-dessus des contrôles UI.
 */
export function useOverlayPointerPassthrough(enabled: boolean): void {
  useEffect(() => {
    const api = window.ath?.overlay;
    if (!enabled || !api?.setPointerPassthrough) return;

    let passthrough = true;
    let raf = 0;

    const apply = (ignore: boolean) => {
      if (ignore === passthrough) return;
      passthrough = ignore;
      api.setPointerPassthrough(ignore);
    };

    const probe = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y);
      const interactive = Boolean(el?.closest(INTERACTIVE_SELECTOR));
      apply(!interactive);
    };

    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => probe(e.clientX, e.clientY));
    };

    const onLeave = () => apply(true);

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    apply(true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      api.setPointerPassthrough(true);
    };
  }, [enabled]);
}
