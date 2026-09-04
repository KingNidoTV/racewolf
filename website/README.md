# Site RaceWolf

Page de téléchargement statique (HTML/CSS).

## Aperçu local

```powershell
npm run website
```

Ouvre ensuite [http://localhost:4178](http://localhost:4178).

Le script copie le logo et les captures. Pour que le bouton **Télécharger** fonctionne en local, copie `release/RaceWolf-0.5.0-portable.exe` dans `website/downloads/`.

## Retours Beta (avis & bugs)

Dans `website/config.js`, définis `feedbackEmail` avec l’adresse qui recevra les retours (ex. votre boîte Gmail ou Proton). Le formulaire ouvre le client mail du testeur avec le message pré-rempli ; le bouton **Copier le texte** sert de secours.

## Mettre le site en ligne

Le `.exe` fait ~83 Mo : GitHub Pages / Cloudflare Pages le refusent souvent. Deux options simples :

1. **Héberger tout le dossier `website/`** sur un espace qui accepte les gros fichiers (VPS, NAS, Drive public, itch.io).
2. **GitHub Releases** pour le `.exe`, et GitHub Pages uniquement pour la page. Dans ce cas, change `downloadUrl` dans `website/config.js` vers l’URL de la release.

Windows SmartScreen peut afficher « Windows a protégé votre PC » : Informations complémentaires → Exécuter quand même (app non signée).
