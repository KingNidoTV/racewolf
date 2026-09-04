# Relais collaboration

Serveur WebSocket pour synchroniser les stratégies Pit Crew à distance (code à 4 chiffres).

Le recensement Beta se fait par **e-mail** (plus besoin de ce relais) : chaque inscription arrive dans la boîte définie dans `electron/beta/betaRegisterConfig.ts`.

## Lancer un relais

```bash
npm run collab:relay
```

URL locale : `ws://127.0.0.1:4177`

## Déployer (Render, gratuit)

1. Poussez le dépôt sur GitHub  
2. [render.com](https://render.com) → New → Blueprint → ce repo  
3. Dans l’app : `wss://….onrender.com`
