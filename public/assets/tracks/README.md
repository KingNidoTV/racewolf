# Carte circuit (optionnel)

**Non, vous n’avez pas besoin d’une carte par circuit.**

Par défaut ATH utilise un **tracé SVG générique** : les voitures se placent avec `CarIdxLapDistPct` du SDK iRacing.

## Image de fond (optionnel)

Si vous voulez le vrai plan du circuit en arrière-plan :

- `public/assets/tracks/{slug}.png` — ex. `road-atlanta.png`
- ou `{TrackID}.png`

Sans fichier, seul le tracé stylisé s’affiche (les ronds restent corrects).

## Tracé SVG automatique

ATH charge automatiquement, dans cet ordre :

1. `public/assets/tracks/{slug}.json` — ex. `road-atlanta.json`
2. `public/assets/tracks/{TrackID}.json` — ex. `45.json`
3. Anneau générique si aucun fichier

Format JSON :

```json
{
  "centerPath": "M 100, 172 A 72, 72 0 1, 1 99.99, 172"
}
```

Le `centerPath` est la ligne de roulage (viewBox **200×200**, départ en bas). Les voitures suivent ce chemin via `CarIdxLapDistPct`.

## Alignement parfait (avancé)

Tracez le `centerPath` dans Inkscape/Figma sur votre image, exportez le `d` du chemin dans le JSON ci-dessus.
