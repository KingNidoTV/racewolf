import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

export interface EnduranceMenuOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  options: EnduranceMenuOption[];
  placeholder?: string;
  /** Affiche une entrée vide en tête (défaut : oui si placeholder fourni). */
  includeEmptyOption?: boolean;
  className?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  "aria-label"?: string;
}

/**
 * Liste déroulante 100 % HTML (pas de &lt;select&gt; natif).
 * Évite le bug Windows où les menus natifs se déforment derrière
 * l’overlay garage transparent Electron.
 */
export function EnduranceMenuSelect({
  value,
  options,
  placeholder = "Choisir…",
  includeEmptyOption,
  className,
  disabled = false,
  onChange,
  "aria-label": ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const showEmpty =
    includeEmptyOption ?? Boolean(placeholder && placeholder.length > 0);

  const selected = options.find((o) => o.value === value);
  const display = selected?.label ?? placeholder;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const onTriggerKey = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div
      ref={rootRef}
      className={[
        "endurance-menu",
        open ? "endurance-menu--open" : null,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="endurance-menu__trigger endurance-field__select"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
        onKeyDown={onTriggerKey}
      >
        <span
          className={
            selected
              ? "endurance-menu__label"
              : "endurance-menu__label endurance-menu__label--placeholder"
          }
        >
          {display}
        </span>
        <span className="endurance-menu__chevron" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <ul
          id={listId}
          className="endurance-menu__list"
          role="listbox"
          aria-label={ariaLabel ?? placeholder}
        >
          {showEmpty ? (
            <li role="option" aria-selected={value === ""}>
              <button
                type="button"
                className={[
                  "endurance-menu__option",
                  value === "" ? "endurance-menu__option--active" : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  onChange("");
                  close();
                }}
              >
                {placeholder}
              </button>
            </li>
          ) : null}
          {options.map((opt) => (
            <li key={opt.value} role="option" aria-selected={opt.value === value}>
              <button
                type="button"
                className={[
                  "endurance-menu__option",
                  opt.value === value ? "endurance-menu__option--active" : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  onChange(opt.value);
                  close();
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
