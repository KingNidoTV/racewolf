import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import type { DemoOverlayPreset } from "../types/ipc";
import type {
  OverlayPanelLayout,
  OverlayPanelPrefs,
  OverlayPanelVisibilityKey,
} from "../types/overlayPrefs";
import {
  DEFAULT_OVERLAY_LAYOUT,
  DEFAULT_OVERLAY_PREFS,
  normalizeOverlayLayout,
} from "../types/overlayPrefs";
import { RaceStandingsPanel } from "../components/standings/RaceStandingsPanel";
import { TimingPanel } from "../components/TimingPanel";
import { TrackMapPanel } from "../components/TrackMapPanel";
import { RelativePanel } from "../components/RelativePanel";
import { AthHudPanel } from "../components/AthHudPanel";
import { StrategyRaceBar } from "../components/strategy/StrategyRaceBar";
import { BoxCallOverlayPanel } from "../components/strategy/BoxCallOverlayPanel";
import { useOverlayBoxCall } from "../hooks/useOverlayBoxCall";
import { useRadioAutoDismiss } from "../hooks/useRadioAutoDismiss";
import type { RacingTelemetry } from "../types/telemetry";
import "../styles/overlays.css";

interface Props {
  data: RacingTelemetry;
  demoPreset?: DemoOverlayPreset | null;
  panelPrefs?: OverlayPanelPrefs | null;
  /** Mode intégré (aperçu launcher) : 100% au lieu de 100vw/vh. */
  embedded?: boolean;
  /** Autorise le déplacement / redimensionnement des panneaux. */
  editable?: boolean;
  /** Force l'affichage radio même inactive (aperçu). */
  forceRadioVisible?: boolean;
  onLayoutChange?: (layout: OverlayPanelLayout) => void;
}

type InteractMode = "move" | "resize";

function FloatPanel({
  id,
  layout,
  editable,
  active,
  onInteractStart,
  children,
}: {
  id: OverlayPanelVisibilityKey;
  layout: OverlayPanelLayout;
  editable: boolean;
  active: boolean;
  onInteractStart: (
    id: OverlayPanelVisibilityKey,
    mode: InteractMode,
    e: ReactPointerEvent<HTMLElement>,
  ) => void;
  children: ReactNode;
}) {
  const pos = layout[id] ?? DEFAULT_OVERLAY_LAYOUT[id];
  const scale = pos.scale ?? 1;
  return (
    <div
      className={[
        "racing-float",
        editable ? "racing-float--editable" : null,
        active ? "racing-float--dragging" : null,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        ["--panel-scale" as string]: String(scale),
      }}
      data-panel-id={id}
      onPointerDown={
        editable ? (e) => onInteractStart(id, "move", e) : undefined
      }
    >
      {editable ? (
        <>
          <span className="racing-float__handle" aria-hidden>
            ⠿
          </span>
          <span
            className="racing-float__resize"
            title="Redimensionner"
            aria-label="Redimensionner"
            onPointerDown={(e) => {
              e.stopPropagation();
              onInteractStart(id, "resize", e);
            }}
          />
          <span className="racing-float__scale" aria-hidden>
            {Math.round(scale * 100)}%
          </span>
        </>
      ) : null}
      <div className="racing-float__body">{children}</div>
    </div>
  );
}

export function RacingOverlay({
  data,
  demoPreset = "racing",
  panelPrefs = DEFAULT_OVERLAY_PREFS,
  embedded = false,
  editable = false,
  forceRadioVisible = false,
  onLayoutChange,
}: Props) {
  const prefs = panelPrefs ?? DEFAULT_OVERLAY_PREFS;
  const focus = demoPreset && demoPreset !== "racing" ? demoPreset : null;
  const { boxCall, toggle: toggleBoxCall, send, clear } =
    useOverlayBoxCall(prefs);
  const player = data.standings.find((r) => r.isPlayer);
  const rootRef = useRef<HTMLDivElement>(null);
  const [localLayout, setLocalLayout] = useState<OverlayPanelLayout | null>(
    null,
  );
  const [activeId, setActiveId] = useState<OverlayPanelVisibilityKey | null>(
    null,
  );
  const layoutRef = useRef<OverlayPanelLayout>(
    prefs.layout ?? DEFAULT_OVERLAY_LAYOUT,
  );
  const interactRef = useRef<{
    id: OverlayPanelVisibilityKey;
    mode: InteractMode;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    originScale: number;
  } | null>(null);

  const layout = localLayout ?? prefs.layout ?? DEFAULT_OVERLAY_LAYOUT;
  layoutRef.current = layout;

  useRadioAutoDismiss(
    boxCall.active && prefs.boxCall && !forceRadioVisible,
    data.trackMap,
    data.timing.sectorCount,
    clear,
  );

  const onInteractStart = useCallback(
    (
      id: OverlayPanelVisibilityKey,
      mode: InteractMode,
      e: ReactPointerEvent<HTMLElement>,
    ) => {
      if (!editable) return;
      const target = e.target as HTMLElement | null;
      if (
        mode === "move" &&
        target?.closest(
          "button, a, input, select, textarea, label, .racing-float__resize",
        )
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      const base = layoutRef.current;
      const pos = base[id] ?? DEFAULT_OVERLAY_LAYOUT[id];
      interactRef.current = {
        id,
        mode,
        startX: e.clientX,
        startY: e.clientY,
        originX: pos.x,
        originY: pos.y,
        originScale: pos.scale ?? 1,
      };
      setActiveId(id);
      setLocalLayout({ ...base });
      e.currentTarget.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const inter = interactRef.current;
        const root = rootRef.current;
        if (!inter || !root) return;
        const rect = root.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        let nextPos = layoutRef.current[inter.id] ?? DEFAULT_OVERLAY_LAYOUT[inter.id];

        if (inter.mode === "move") {
          const dx = ((ev.clientX - inter.startX) / rect.width) * 100;
          const dy = ((ev.clientY - inter.startY) / rect.height) * 100;
          nextPos = {
            ...nextPos,
            x: Math.min(
              95,
              Math.max(0, Math.round((inter.originX + dx) * 10) / 10),
            ),
            y: Math.min(
              95,
              Math.max(0, Math.round((inter.originY + dy) * 10) / 10),
            ),
          };
        } else {
          // Resize : déplacement diagonal (droite/bas = plus grand)
          const delta =
            ((ev.clientX - inter.startX) + (ev.clientY - inter.startY)) /
            (rect.width * 0.55);
          nextPos = {
            ...nextPos,
            scale: Math.min(
              2,
              Math.max(
                0.5,
                Math.round((inter.originScale + delta) * 100) / 100,
              ),
            ),
          };
        }

        const next = {
          ...layoutRef.current,
          [inter.id]: nextPos,
        };
        layoutRef.current = next;
        setLocalLayout(next);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        setActiveId(null);
        interactRef.current = null;
        const finalLayout = normalizeOverlayLayout(layoutRef.current);
        setLocalLayout(null);
        onLayoutChange?.(finalLayout);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [editable, onLayoutChange],
  );

  const standingsPanel = (
    <RaceStandingsPanel
      session={data.session}
      standings={data.standings}
      trackFlag={data.trackFlag}
      sectorCount={data.timing.sectorCount}
      topN={prefs.standingsTopN}
      ahead={prefs.standingsAhead}
      behind={prefs.standingsBehind}
      showOtherClasses={prefs.standingsShowOtherClasses}
    />
  );

  const boxPanel =
    prefs.boxCall || focus === "boxcall" || forceRadioVisible ? (
      <BoxCallOverlayPanel
        boxCall={
          editable || forceRadioVisible
            ? {
                ...boxCall,
                active: true,
                message: boxCall.message?.trim() || "Box in this lap",
                byName: boxCall.byName ?? "Ingé",
              }
            : boxCall
        }
        onToggle={editable ? () => undefined : toggleBoxCall}
        onSendReply={
          editable ? undefined : (message) => send(message, "custom")
        }
        forceVisible={focus === "boxcall" || forceRadioVisible}
        interactive={!editable}
        driverName={player?.name}
        carColor={player?.carColor}
        prefs={prefs}
      />
    ) : null;

  const rootClass = [
    "racing-overlay",
    "racing-overlay--free",
    embedded ? "racing-overlay--embedded" : null,
    editable ? "racing-overlay--editable" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const float = (
    id: OverlayPanelVisibilityKey,
    visible: boolean,
    child: ReactNode,
  ) =>
    visible && child ? (
      <FloatPanel
        key={id}
        id={id}
        layout={layout}
        editable={editable}
        active={activeId === id}
        onInteractStart={onInteractStart}
      >
        {child}
      </FloatPanel>
    ) : null;

  if (focus === "standings-practice" || focus === "standings-race" || focus === "flags") {
    return (
      <div className={rootClass} ref={rootRef}>
        {float("standings", true, standingsPanel)}
      </div>
    );
  }

  if (focus === "timing") {
    return (
      <div className={rootClass} ref={rootRef}>
        {float(
          "timing",
          true,
          <TimingPanel
            timing={data.timing}
            recentLapsCount={prefs.timingRecentLaps}
          />,
        )}
      </div>
    );
  }

  if (focus === "trackmap") {
    return (
      <div className={rootClass} ref={rootRef}>
        {float(
          "trackmap",
          true,
          <TrackMapPanel
            map={data.trackMap}
            lap={data.session.lap}
            timeLabel={data.session.timeRemaining}
          />,
        )}
      </div>
    );
  }

  if (focus === "relative") {
    return (
      <div className={rootClass} ref={rootRef}>
        {float(
          "relative",
          true,
          <RelativePanel
            entries={data.relative}
            standings={data.standings}
            ahead={prefs.relativeAhead}
            behind={prefs.relativeBehind}
          />,
        )}
      </div>
    );
  }

  if (focus === "strategy") {
    return (
      <div className={rootClass} ref={rootRef}>
        {float("strategy", true, <StrategyRaceBar live={data.strategyLive} />)}
      </div>
    );
  }

  if (focus === "boxcall") {
    return (
      <div className={rootClass} ref={rootRef}>
        {float("boxCall", true, boxPanel)}
      </div>
    );
  }

  if (focus === "hud") {
    return (
      <div className={rootClass} ref={rootRef}>
        {float("hud", true, <AthHudPanel ath={data.ath} />)}
      </div>
    );
  }

  return (
    <div className={rootClass} ref={rootRef}>
      {float("standings", prefs.standings, standingsPanel)}
      {float(
        "timing",
        prefs.timing,
        <TimingPanel
          timing={data.timing}
          recentLapsCount={prefs.timingRecentLaps}
        />,
      )}
      {float(
        "trackmap",
        prefs.trackmap,
        <TrackMapPanel
          map={data.trackMap}
          lap={data.session.lap}
          timeLabel={data.session.timeRemaining}
        />,
      )}
      {float("boxCall", prefs.boxCall || forceRadioVisible, boxPanel)}
      {float(
        "relative",
        prefs.relative,
        <RelativePanel
          entries={data.relative}
          standings={data.standings}
          ahead={prefs.relativeAhead}
          behind={prefs.relativeBehind}
        />,
      )}
      {float(
        "strategy",
        prefs.strategy,
        <StrategyRaceBar live={data.strategyLive} />,
      )}
      {float("hud", prefs.hud, <AthHudPanel ath={data.ath} />)}
    </div>
  );
}
