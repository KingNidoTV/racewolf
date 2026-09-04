import { useEffect, useMemo, useState } from "react";
import { getFlagCandidates } from "../../utils/assets";

interface Props {
  nationality: string;
}

/**
 * Drapeau pays. Images locales d’abord (portable hors-ligne), puis CDN.
 * Pas d’emoji : Windows n’affiche pas les drapeaux régionaux correctement.
 */
export function FlagImage({ nationality }: Props) {
  const code = nationality.trim().toLowerCase();
  const candidates = useMemo(
    () => (code ? getFlagCandidates(code) : []),
    [code],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [code]);

  if (!code || candidates.length === 0) {
    return (
      <span
        className="flag-image flag-image--placeholder"
        title="Pays inconnu"
        aria-hidden
      />
    );
  }

  const src = candidates[index];
  if (!src || index >= candidates.length) {
    return (
      <span
        className="flag-image flag-image--code"
        title={code.toUpperCase()}
        aria-label={code.toUpperCase()}
      >
        {code.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      className="flag-image"
      src={src}
      alt={code.toUpperCase()}
      title={code.toUpperCase()}
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
