interface Props {
  text: string;
  className?: string;
}

/** Infobulle CSS (le title natif ne s'affiche souvent pas dans l'overlay Electron). */
export function InfoHint({ text, className }: Props) {
  return (
    <span
      className={["info-hint", className].filter(Boolean).join(" ")}
      tabIndex={0}
      role="note"
      aria-label={text}
    >
      <span className="info-hint__glyph" aria-hidden>
        i
      </span>
      <span className="info-hint__bubble">{text}</span>
    </span>
  );
}
