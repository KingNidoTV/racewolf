import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_OVERLAY_LAYOUT,
  type OverlayPanelLayout,
  type OverlayPanelPrefs,
} from "../types/overlayPrefs";
import { useMockTelemetry } from "../hooks/useMockTelemetry";
import { RacingOverlay } from "../overlays/RacingOverlay";

const DESIGN_W = 1920;
const DESIGN_H = 1080;

interface Props {
  prefs: OverlayPanelPrefs;
  onLayoutChange: (layout: OverlayPanelLayout) => void;
  onResetLayout: () => void;
}

/** Aperçu réel 16:9 (1920×1080 mis à l'échelle) + déplacement des panneaux. */
export function OverlayLayoutPreview({
  prefs,
  onLayoutChange,
  onResetLayout,
}: Props) {
  const data = useMockTelemetry("racing");
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.35);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    const update = () => {
      const width = el.clientWidth;
      if (width <= 0) return;
      // Cadre strictement 16:9 → scale uniquement sur la largeur
      setScale(width / DESIGN_W);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <section className="launcher-page__section overlay-layout-preview overlay-layout-preview--live">
      <div className="overlay-layout-preview__header">
        <div>
          <h3>Aperçu écran</h3>
          <p className="launcher-page__hint">
            Vue réelle 16:9. Glissez pour déplacer, coin bas-droit pour
            redimensionner.
          </p>
        </div>
        <button
          type="button"
          className="launcher__btn launcher__btn--ghost launcher__btn--sm"
          onClick={onResetLayout}
        >
          Reset positions
        </button>
      </div>
      <div className="overlay-layout-preview__monitor">
        <div className="overlay-layout-preview__bezel">
          <div
            ref={frameRef}
            className="overlay-layout-preview__screen"
          >
            <div
              className="overlay-layout-preview__stage"
              style={{
                width: DESIGN_W,
                height: DESIGN_H,
                transform: `scale(${scale})`,
              }}
            >
              <RacingOverlay
                data={data}
                demoPreset="racing"
                panelPrefs={prefs}
                embedded
                editable
                forceRadioVisible
                onLayoutChange={onLayoutChange}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export { DEFAULT_OVERLAY_LAYOUT };
