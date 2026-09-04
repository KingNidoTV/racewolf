import { resolveBrand } from "../data/brands";

const BASE = import.meta.env.BASE_URL;

const IMAGE_EXT = ["png", "webp", "svg", "jpg", "jpeg"] as const;

function assetPath(folder: string, name: string, ext: string): string {
  const base = BASE.endsWith("/") ? BASE : `${BASE}/`;
  return `${base}assets/${folder}/${name}.${ext}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function pushLogoPaths(paths: string[], name: string): void {
  for (const ext of IMAGE_EXT) {
    paths.push(assetPath("logos", name, ext));
  }
}

/** Chemins candidats pour le logo constructeur (jamais le n° de course). */
export function getCarLogoCandidates(
  _carNumber: string,
  carBrand: string,
): string[] {
  const paths: string[] = [];
  const brand = resolveBrand(carBrand);

  if (brand) {
    pushLogoPaths(paths, brand.id);
    pushLogoPaths(paths, brand.slug);
  }

  const slug = slugify(carBrand);
  if (slug && slug !== brand?.slug && !/^\d+$/.test(slug)) {
    pushLogoPaths(paths, slug);
  }

  return paths;
}

const BO2_FLAIR_CDN =
  "https://cdn.jsdelivr.net/gh/fixfactory/bo2-official-overlays@main/Images/Flairs";

/** Chemins candidats pour le drapeau (ISO 3166-1 alpha-2 ou slug type gb-eng). */
export function getFlagCandidates(nationality: string): string[] {
  const code = nationality.trim().toLowerCase();
  if (!/^[a-z]{2}(-[a-z]{2,3})?$/.test(code)) return [];

  const paths: string[] = [];
  // Local d’abord : le portable doit marcher sans Internet.
  for (const ext of IMAGE_EXT) {
    paths.push(assetPath("flags", code, ext));
  }
  paths.push(`https://flagcdn.com/w40/${code}.png`);
  paths.push(`https://flagcdn.com/${code}.svg`);
  paths.push(`${BO2_FLAIR_CDN}/${code}.png`);
  return paths;
}

/** Image de fond carte circuit (optionnelle). */
export function getTrackMapImageCandidates(
  trackSlug: string,
  trackId: number,
): string[] {
  const paths: string[] = [];
  const slug = trackSlug.trim();
  if (slug) {
    for (const ext of IMAGE_EXT) {
      paths.push(assetPath("tracks", slug, ext));
    }
  }
  for (const ext of IMAGE_EXT) {
    paths.push(assetPath("tracks", String(trackId), ext));
  }
  return paths;
}
