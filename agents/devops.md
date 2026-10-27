# Rol DevOps (frontend)

Manténs les imatges del frontend, el Caddyfile i la CI d'aquest repositori. Les operacions de servidor (Compose de producció, desplegament, incidències, dades) les defineix `backend/agents/devops.md`: llegeix-lo abans de tocar res que arribi al servidor, i aplica-hi les mateixes regles d'operació.

## Peces d'aquest repositori

| Peça | Què fa |
|---|---|
| `Dockerfile` | Imatge de desenvolupament: Node 22, `npm ci`, `npm run dev` amb Vite i proxy `/api` cap a `API_PROXY_TARGET` |
| `Dockerfile.production` | Build de Vite i imatge final `caddy:2-alpine` que serveix `dist/` a `/srv`, amb `HEALTHCHECK` a `/healthz` |
| `Caddyfile` | Port 8080, `/healthz`, `/api` i `/api/*` cap a `backend:8000`, resta amb fallback SPA a `index.html`. Sense TLS: el proxy del host el gestiona |
| `.github/workflows/ci.yml` | Build de la imatge, `npm run build`, `npm test`, imatge de producció, `caddy validate`, smoke test, publicació a GHCR per digest en push a `main`, i `deploy` si `DEPLOY_ENABLED` és `true` |
| `scripts/deploy-ci.sh` | Validació d'entrades i SSH al servidor per executar `deploy.py` amb el digest publicat |
| `CI.md` | Com reproduir la CI en local |

## Invariants que la CI comprova

- Sense backend, `/api/health` respon 502: una ruta de l'API mai torna l'HTML de la SPA.
- `/` i qualsevol ruta de l'aplicació (`/login`) tornen `index.html` amb `<div id="root">`.
- `/healthz` respon abans que res més; el `HEALTHCHECK` de la imatge en depèn.
- Les accions de GitHub van fixades per SHA amb el comentari de versió; `persist-credentials: false`.
- El job de `deploy` rep només el digest que `publish` ha provat.

Un canvi al Caddyfile, als Dockerfiles o al workflow conserva aquests invariants o actualitza el test que els comprova al mateix PR, explicant per què.

## Procediment

1. Llegeix la issue i identifica quina peça canvia i quin invariant toca.
2. Implementa el canvi en una branca; cap valor del servidor (host, usuari, ruta, clau) al repositori: són variables i secrets de GitHub.
3. Reprodueix la CI en local (secció següent) abans d'obrir el PR.
4. Al PR: què canvia, per què, ordres executades amb el resultat, i si el canvi requereix acció al servidor o variables noves a GitHub.

## Validació

Des de `frontend`, amb Docker en marxa:

```bash
bash -n scripts/deploy-ci.sh
docker build --tag frontend-ci .
docker run --rm frontend-ci npm run build
docker run --rm frontend-ci npm test
docker build --file Dockerfile.production --tag frontend-production-ci .
docker run --rm frontend-production-ci caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

Smoke test de la imatge de producció, amb neteja en acabar:

```bash
docker run -d --name frontend-smoke -p 127.0.0.1:18080:8080 frontend-production-ci
curl --retry 15 --retry-all-errors --retry-delay 1 --fail http://127.0.0.1:18080/healthz
curl --fail http://127.0.0.1:18080/login | grep -q '<div id="root"'
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:18080/api/health
docker rm -f frontend-smoke
```

Fet vol dir: totes les ordres acaben sense error, `/api/health` dona `502` i els invariants de dalt es mantenen.
