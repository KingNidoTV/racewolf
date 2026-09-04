import { DEFAULT_CENTERLINE } from "./geometry";

const cache = new Map<string, string>();

function cacheKey(slug: string, trackId: number): string {
  return `${slug}::${trackId}`;
}

function jsonUrl(name: string): string {
  const base = import.meta.env.BASE_URL;
  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root}assets/tracks/${name}.json`;
}

async function fetchPath(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const data = (await res.json()) as { centerPath?: string };
    const path = data.centerPath?.trim();
    return path || null;
  } catch {
    return null;
  }
}

/**
 * Charge le tracé : `assets/tracks/{slug}.json` → `{id}.json` → cercle par défaut.
 */
export async function loadCenterline(
  trackSlug: string,
  trackId: number,
): Promise<string> {
  const key = cacheKey(trackSlug, trackId);
  const hit = cache.get(key);
  if (hit) return hit;

  const urls: string[] = [];
  const slug = trackSlug.trim();
  if (slug) urls.push(jsonUrl(slug));
  if (trackId > 0) urls.push(jsonUrl(String(trackId)));

  for (const url of urls) {
    const path = await fetchPath(url);
    if (path) {
      cache.set(key, path);
      return path;
    }
  }

  cache.set(key, DEFAULT_CENTERLINE);
  return DEFAULT_CENTERLINE;
}
