# Frontend · React i Vite

Guia per executar i desenvolupar la web **al teu ordinador**. React és el frontend; les seves peticions passen per l'API de FastAPI, que consulta PostgreSQL.

## 1. Abans de començar

Necessites Git i Docker Desktop obert amb el motor de contenidors Linux en marxa. En Linux també pots utilitzar Docker Engine amb Compose. Comprova-ho des d'una terminal:

```bash
docker info
docker compose version
```

`docker info` ha de mostrar informació del servidor sense errors de connexió. Necessites Docker Compose 2.32 o posterior. Amb aquest entorn no cal instal·lar Node, Python ni PostgreSQL a l'ordinador, ni executar `npm install` manualment.

Necessites els dos repositoris en carpetes germanes:

```text
GitHub/
├── backend/       ← conté compose.yaml
└── frontend/      ← conté el codi de React
```

Si encara no els tens, executa això des de la carpeta on guardes els projectes:

```bash
git clone https://github.com/UB-ES-F4-2026/backend.git
git clone https://github.com/UB-ES-F4-2026/frontend.git
```

Si ja els tens, no els tornis a clonar.

## 2. Arrencar la web i la resta de serveis

**Els comandaments Docker Compose d'aquesta guia s'executen des de `backend`.** El seu `compose.yaml` coordina tota l'aplicació i busca el codi de React a `../frontend`. Que el fitxer sigui al backend no impedeix que arrenqui el frontend.

Si la terminal és a `frontend`, primer canvia de carpeta:

```bash
cd ../backend
```

Si ja ets a `backend`, no cal executar aquest `cd`.

Abans del primer inici, crea **`backend/.env`** a partir de la plantilla. Des de `backend`, executa l'opció del teu sistema; aquests comandaments no sobreescriuen un `.env` existent.

PowerShell:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Linux/macOS:

```bash
if [ ! -e .env ]; then cp .env.example .env; fi
```

Si ja tens `.env`, conserva'l. Compara els noms de les variables amb `.env.example` i afegeix les que faltin, mantenint les credencials de la teva instal·lació. No substitueixis el fitxer sencer.

Compose llegeix `.env` automàticament. `.env.example` només és una plantilla: no es llegeix durant l'arrencada. Si falta una variable necessària o és buida, Compose s'atura amb un missatge que n'indica el nom.

Ara arrenca el conjunt:

```bash
docker compose up --build --wait
```

Aquest és el comandament habitual: construeix i arrenca **React, FastAPI, PostgreSQL i pgAdmin**. La primera vegada pot tardar uns minuts. `--wait` espera que estiguin saludables i els deixa en segon pla; pots tancar la terminal quan acabi correctament.

PostgreSQL crea la base de dades en el primer inici, quan el seu volum és buit. Després, el backend aplica les migracions abans d'arrencar l'API.

Obre http://localhost:5173. La pantalla inicial hauria de confirmar la connexió amb el backend.

Per comprovar la comunicació completa, obre http://localhost:5173/api/health. Hauries de veure:

```json
{"status":"ok","service":"backend","database":"ok"}
```

Això confirma que la petició arriba a l'API i que l'API pot consultar PostgreSQL.

### Quina opció d'arrencada he de triar?

Des de `backend`, tria una opció:

| Què necessites? | Comandament |
|---|---|
| Tota l'aplicació (opció habitual) | `docker compose up --build --wait` |
| Web i dependències, sense arrencar pgAdmin | `docker compose up --build --wait frontend` |
| Backend, PostgreSQL i pgAdmin, sense arrencar la web | `docker compose up --build --wait backend pgadmin` |

El servei s'anomena `frontend`, no `front`. En seleccionar-lo, Compose arrenca també backend i PostgreSQL perquè en depèn. En canvi, arrencar només el backend no arrenca la web.

Si ja tens el backend en marxa, pots executar el comandament de tota l'aplicació per afegir el frontend. No cal aturar-ho tot. Les opcions parcials no aturen altres serveis que ja estiguin en marxa.

## 3. Programar i veure els canvis

Des de `backend`:

```bash
docker compose up --build --watch
```

Deixa la terminal oberta i edita els fitxers de `frontend/src/`. Compose sincronitza els canvis i Vite actualitza la web. Amb `Ctrl+C` atures aquesta execució i els serveis que ha arrencat.

Si ja havies arrencat el projecte en segon pla amb `--wait`, executa això en una altra terminal situada a `backend`:

```bash
docker compose watch
```

En aquest cas, `Ctrl+C` atura només la sincronització, i els serveis continuen en marxa.

| Què has canviat? | Què fa Watch? |
|---|---|
| `frontend/src/` o `frontend/index.html` | Sincronitza els fitxers; Vite actualitza la web |
| `frontend/vite.config.js` | Sincronitza el fitxer i reinicia el frontend |
| `frontend/package.json`, `package-lock.json` o `Dockerfile` | Reconstrueix la imatge |

Si afegeixes carpetes com `public/`, cal afegir-ne la regla de sincronització a `backend/compose.yaml` perquè Watch també les copiï.

**Sense Watch, desar un fitxer no actualitza el codi del contenidor.** Després de rebre canvis de l'equip o modificar dependències o configuració, executa des de `backend`:

```bash
docker compose up --build --wait
```

Conserva `package-lock.json` a Git i actualitza'l juntament amb `package.json` quan canviïn les dependències. Docker utilitza `npm ci` durant la construcció de la imatge.

## 4. Aturar i tornar a arrencar

Tots aquests comandaments s'executen des de `backend`.

Per aturar tot el projecte conservant les dades:

```bash
docker compose down
```

Per tornar a arrencar-lo:

```bash
docker compose up --build --wait
```

**No afegeixis `-v` a `docker compose down` ni esborris els volums des de Docker Desktop:** eliminaria les dades locals de PostgreSQL i la configuració de pgAdmin.

Si només vols aturar la web, deixant la resta en marxa:

```bash
docker compose stop frontend
```

Per tornar a arrencar-la:

```bash
docker compose up --build --wait frontend
```

Cada company té les seves pròpies dades locals. Git comparteix el codi i les migracions, no els registres de PostgreSQL.

## 5. Ports i configuració

La configuració personal del conjunt és a **`backend/.env`**, que has preparat a l'apartat 2. `.env.example` és només la plantilla compartida; Compose utilitza els valors de `.env` i els passa als contenidors.

Pots consultar l'[apartat de configuració del backend](https://github.com/UB-ES-F4-2026/backend#6-com-funciona-la-configuració-ports-i-credencials). No sobreescriguis un `.env` existent i no el pugis a Git. Les variables exportades a la terminal tenen prioritat sobre `.env`; per seguir aquesta guia, evita configurar-les en dos llocs.

| Variable | Valor de la plantilla | Què canvia? |
|---|---|---|
| `FRONTEND_PATH` | `../frontend` | Ruta al codi de React, relativa a backend |
| `FRONTEND_PORT` | `5173` | Port de la web al navegador |
| `BACKEND_PORT` | `8000` | Port per accedir directament a l'API |
| `POSTGRES_PORT` | `5433` | Port per accedir a PostgreSQL des de l'ordinador |
| `PGADMIN_PORT` | `5050` | Port de la web d'administració |

Per exemple, si el port 8000 està ocupat, posa `BACKEND_PORT=8001` a `backend/.env`. La documentació de l'API serà a http://localhost:8001/docs i la web continuarà a http://localhost:5173. No cal canviar el codi de React.

Després de canviar `.env`, executa des de `backend`:

```bash
docker compose up --build --wait
```

`docker compose restart` no aplica els nous valors de `.env`. Si canvies `FRONTEND_PORT`, utilitza el nou port a l'adreça del navegador.

## 6. Fer peticions a l'API des de React

Utilitza rutes relatives amb el prefix `/api`:

```javascript
const response = await fetch('/api/health');
const data = await response.json();
```

El recorregut és:

```text
Navegador → Vite → FastAPI → PostgreSQL
           /api   backend:8000   db:5432
```

`vite.config.js` reenvia les peticions `/api` a `http://backend:8000`, conservant el prefix. Compose configura aquest destí amb `API_PROXY_TARGET`.

- `backend` és un nom intern de la xarxa Docker: no posis `http://backend:8000` al `fetch` del navegador.
- React no es connecta directament a PostgreSQL; les operacions passen per l'API.
- No posis contrasenyes ni claus privades en variables `VITE_*`: són visibles per a qui utilitza la web.

Aquest proxy és per al desenvolupament local. Publicar la web en producció requerirà una configuració pròpia.

## 7. Si la web no funciona

Des de `backend`, comprova l'estat i els errors:

```bash
docker compose ps -a
docker compose logs --tail 60 frontend backend db
```

| Què passa? | Què has de fer? |
|---|---|
| Compose indica que falta una variable | Revisa `backend/.env` seguint l'apartat 2; no sobreescriguis les credencials existents |
| Docker no respon | Obre Docker Desktop, espera que el motor estigui en marxa i comprova `docker info` |
| No troba `compose.yaml` | Situa la terminal a `backend` |
| No troba el frontend en construir | Comprova les carpetes germanes o `FRONTEND_PATH` |
| No apareix cap servei frontend | Executa `docker compose up --build --wait`; potser havies seleccionat només backend i pgAdmin |
| El frontend està aturat o no saludable | Revisa els logs del frontend i del backend |
| La web no obre | Comprova l'estat del frontend i el port configurat a `FRONTEND_PORT` |
| Hi ha un port ocupat | Canvia el port corresponent a `backend/.env` i torna a executar `up --build --wait` |
| La web mostra un error de connexió | Consulta els logs de backend i db, a més dels de frontend |
| No es veuen els canvis de codi | Activa Watch o reconstrueix la imatge |
| L'API funciona però falten taules | Comprova amb l'equip de backend que la migració existeixi i s'hagi aplicat |

Per seguir els logs en directe:

```bash
docker compose logs -f frontend backend
```

Aquí `Ctrl+C` només tanca la visualització dels logs; no atura els serveis.

Si demanes ajuda, indica el comandament executat, la carpeta, l'error i en quin ordinador passa. No comparteixis el teu `.env` i revisa que els logs no continguin credencials. No esborris volums per intentar arreglar un error.

## 8. Fitxers del frontend i comprovació de compilació

| Fitxer | Funció |
|---|---|
| `src/main.jsx` | Pantalla inicial i comprovació de connexió |
| `src/style.css` | Estils |
| `index.html` | Pàgina d'entrada |
| `vite.config.js` | Configuració de React i del proxy de l'API |
| `Dockerfile` | Entorn Node dins del contenidor |
| `package.json` | Dependències i comandaments npm |
| `package-lock.json` | Versions concretes de les dependències |

Amb el frontend en marxa, executa des de `backend`:

```bash
docker compose exec frontend npm run build
```

Això comprova que el frontend compila i genera `dist/` dins del contenidor. No publica la web ni cal executar-ho cada vegada que deses un fitxer.

La configuració de pgAdmin i les instruccions de migracions són al [README del backend](https://github.com/UB-ES-F4-2026/backend#readme).


## 9. Tests del frontend

Els tests s’agrupen a `tests/`, amb noms acabats en `.test.ts` o `.test.tsx`.
Vitest els executa i React Testing Library permet provar els components
mitjançant interaccions d’usuari. S’utilitza jsdom, un entorn de navegador
simulat: no s’obre cap finestra del navegador.

### Executar els tests

Des de `frontend`, amb Node instal·lat:

```bash
npm ci
npm test
```

`npm ci` instal·la les dependències del `package-lock.json`; cal executar-lo
el primer cop i quan canviïn les dependències. Després, n’hi ha prou amb
`npm test` per tornar a passar les proves.

Amb Docker, des de `backend`, pots construir i executar només el servei de
frontend, sense arrencar-ne les dependències. Cal tenir el `.env` de Compose
configurat tal com s’explica a l’apartat 2.

```bash
docker compose build frontend
docker compose run --rm --no-deps frontend npm test
```

Reconstrueix la imatge quan canviïn els tests, el codi o les dependències
perquè el contenidor executi la versió actual.

### Interpretar els resultats

`npm test` executa totes les proves una vegada i acaba. La terminal mostra
els fitxers i tests que passen (`passed`) o fallen (`failed`). Si una prova
falla, indica el cas i la diferència entre el resultat esperat i l’obtingut,
i el comandament retorna un codi d’error.

Passar els tests no substitueix la revisió de QA. La compilació es comprova
separadament amb `npm run build`. Per comprovar els tipus dels tests:

```bash
npx tsc -p tests/tsconfig.json
```

### Afegir tests

- Crea un fitxer a `tests/` amb el nom del component o funcionalitat i el
  sufix `.test.ts` (lògica) o `.test.tsx` (components amb JSX). La configuració
  també detecta tests dins de subcarpetes.
- Importa `describe`, `it`, `expect` i, si cal, `vi` des de `vitest`.
  Per provar components, utilitza React Testing Library i `user-event`.
- Comprova comportaments observables i resultats esperats. Per aïllar una
  unitat, simula les seves dependències amb `vi.mock` quan sigui necessari.
- Simula les peticions o respostes de l’API en aquestes proves perquè no
  depenguin d’un backend, una base de dades ni comptes reals.
- Mantén cada prova independent: restaura els mocks i reinicia els stores
  que utilitzi. `tests/setup.ts` ja neteja els components renderitzats després
  de cada prova i carrega els mètodes d’assert de `jest-dom`.

La configuració d’execució és a `vitest.config.ts` i la de tipus a
`tests/tsconfig.json`. Els tests es conserven al repositori juntament amb
el codi i s’actualitzen quan canvia el comportament que comproven.
