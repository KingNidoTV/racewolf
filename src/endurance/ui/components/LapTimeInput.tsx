import { useEffect, useState } from "react";
import { formatSecondsToLapTime, parseLapTimeToSeconds } from "../../engine";

interface Props {
  valueSec: number;
  onChange: (seconds: number) => void;
  className?: string;
}

/** Saisie m:ss.SSS — conserve le texte en cours d'édition sans remettre à zéro. */
export function LapTimeInput({ valueSec, onChange, className }: Props) {
  const [draft, setDraft] = useState(() => formatSecondsToLapTime(valueSec));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(formatSecondsToLapTime(valueSec));
    }
  }, [valueSec, focused]);

  const commit = () => {
    setFocused(false);
    const parsed = parseLapTimeToSeconds(draft);
    if (parsed > 0) {
      onChange(parsed);
      setDraft(formatSecondsToLapTime(parsed));
      return;
    }
    setDraft(formatSecondsToLapTime(valueSec));
  };

  return (
    <input
      className={className}
      inputMode="decimal"
      placeholder="m:ss.SSS"
      value={draft}
      onFocus={() => {
        setDraft(formatSecondsToLapTime(valueSec));
        setFocused(true);
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
    />
  );
}
