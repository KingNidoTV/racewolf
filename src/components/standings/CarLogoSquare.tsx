import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { resolveBrand, resolveCarColor } from "../../data/brands";
import { getCarLogoCandidates } from "../../utils/assets";

interface Props {
  carNumber: string;
  carBrand: string;
  carColor: string;
}

export function CarLogoSquare({ carNumber, carBrand, carColor }: Props) {
  const brand = resolveBrand(carBrand);
  const borderColor = resolveCarColor(carNumber, carBrand, carColor);
  const candidates = useMemo(
    () => getCarLogoCandidates(carNumber, carBrand),
    [carNumber, carBrand],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [carNumber, carBrand, candidates.join("|")]);

  const initials = brand
    ? brand.name
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    :
    carBrand
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  const src = candidates[index];
  const showImage = Boolean(src) && index < candidates.length;
  const imgClass = [
    "car-logo-square__img",
    brand?.slug === "audi" ? "car-logo-square__img--audi" : "",
    brand?.slug === "mercedes-benz" ? "car-logo-square__img--mercedes" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className="car-logo-square"
      style={{ "--car-color": borderColor } as CSSProperties}
      title={carBrand}
    >
      {showImage ? (
        <img
          className={imgClass}
          src={src}
          alt=""
          onError={() => setIndex((i) => i + 1)}
        />
      ) : (
        <span className="car-logo-square__fallback" aria-hidden>
          {initials}
        </span>
      )}
    </div>
  );
}
