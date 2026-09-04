# RaceWolf

Overlay transparent pour iRacing avec **launcher**, **SDK iRacing**, préparation endurance et bascule automatique garage / piste.

## Lancement (Windows)

Double-cliquez **`RaceWolf.lnk`** — l’app s’ouvre directement (sans recompiler).

Première fois / après un gros changement de code :

```powershell
npm run build
```

Développement avec rechargement à chaud :

```powershell
cd C:\Users\h24sa\Projects\iracing-ath
npm install
npm run dev
```

Dans le launcher : **Overlay**, **Pit Crew**, **Circuit**, **Radio**, etc.

## Partager une version test (portable)

Génère un `.exe` autonome à envoyer (WeTransfer, Drive, Discord…) :

```powershell
npm run dist
```

Le fichier est dans `release/RaceWolf-0.5.0-portable.exe` (~83 Mo).

Site de téléchargement (aperçu local) :

```powershell
npm run website
```

Puis ouvrir http://localhost:4178 — détails dans `website/README.md`.

Ton ami : double-clic → SmartScreen peut afficher « Windows a protégé votre PC » → **Informations complémentaires** → **Exécuter quand même** (app non signée).

Prérequis côté testeur : Windows 10/64 bits. iRacing optionnel (démo / endurance sans sim).

## Bascule automatique (mode SDK)

| Situation | Overlay affiché |
|-----------|-----------------|
| En voiture sur piste (`IsOnTrackCar`) | Grille course 3×3 |
| Menus / stands / garage (`!IsOnTrack`) | Tableau garage |
| Session invalide / sim fermé | Overlay masqué |

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Launcher + Vite (développement) |
| `npm run demo` | Démarre directement la démo mock |
| `npm run build` | Compile Electron + interface |
| `npm run start` | Build puis lance l’app |
| `npm run dist` | Build + `.exe` portable (`release/`) |
| `npm run typecheck` | Vérification TypeScript |
| `npm run install:electron` | Répare le binaire Electron |

## Structure

- `electron/` — process principal, overlay, télémétrie, IPC
- `src/launcher/` — interface du launcher
- `src/overlays/` — overlays course et garage
- `src/endurance/` — préparation / stratégie endurance
- `scripts/` — lancement, icônes, réparation Electron

## Prérequis

- Windows 10+
- Node.js 20+
- Connexion internet pour le **premier** lancement (téléchargement d’Electron ~120 Mo)
- iRacing ouvert pour le mode SDK

## Erreur « Electron failed to install correctly »

```powershell
npm run install:electron
```

Ou : `scripts\repair-electron.bat`

Puis relancez **`RaceWolf.lnk`**.
