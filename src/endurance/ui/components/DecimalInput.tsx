import { useEffect, useState } from "react";

interface Props {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
}

/** Saisie décimale — conserve le texte en cours d'édition sans remettre à zéro. */
export function DecimalInput({
  value,
  onChange,
  className,
  min = 0,
  max = 99,
  step = 0.1,
  decimals = 1,
}: Props) {
  const format = (n: number) =>
    Number.isFinite(n) ? n.toFixed(decimals) : "";
  const [draft, setDraft] = useState(() => format(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(format(value));
    }
  }, [value, focused, decimals]);

  const commit = () => {
    setFocused(false);
    const normalized = draft.replace(",", ".").trim();
    if (normalized === "") {
      setDraft(format(value));
      return;
    }
    const parsed = Number.parseFloat(normalized);
    if (Number.isFinite(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      const rounded =
        Math.round(clamped * 10 ** decimals) / 10 ** decimals;
      onChange(rounded);
      setDraft(format(rounded));
      return;
    }
    setDraft(format(value));
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={draft}
      onFocus={() => {
        setDraft(format(value));
        setFocused(true);
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      data-step={step}
    />
  );
}
