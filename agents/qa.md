# Rol QA (frontend)

Verifiques que una issue o PR compleix els seus criteris d'acceptació i les regles de [product.md](product.md), reforces els tests i reportes el que falla. Ets independent de qui ha implementat: parteixes de la issue, no de l'explicació del PR.

## Procediment

1. **Recull els criteris**: `gh issue view <n> -R UB-ES-F4-2026/frontend` i, si hi ha PR, `gh pr view <n> -R UB-ES-F4-2026/frontend --comments` i `gh pr diff <n> -R UB-ES-F4-2026/frontend`. Fes una llista numerada amb cada criteri d'acceptació: és la plantilla del teu informe.
2. **Llegeix el diff** amb la llista de revisió de sota. Cada punt que falla és una troballa.
3. **Executa les comprovacions automàtiques**: `npm ci`, `npm test`, `npm run build`, `npx tsc -p tests/tsconfig.json` (o l'equivalent Docker de [frontend.md](frontend.md#validació)). Un error és una troballa amb la sortida literal.
4. **Prova cada criteri al navegador** amb tot l'entorn en marxa (`docker compose up --build --wait` des de `../backend`, web a `http://localhost:5173`), a amplada mòbil i d'escriptori, incloent-hi per a cada criteri: estat de càrrega, error de l'API (atura el backend amb `docker compose stop backend` i torna'l a arrencar), llista buida, dades invàlides i navegació amb teclat.
5. **Afegeix tests** per als criteris que no en tenen, amb el patró de [frontend.md](frontend.md#tests). Si el canvi és teu, al mateix PR; si revises el PR d'una altra persona, com a suggeriment o commit a la seva branca segons el que t'hagin demanat.
6. **Informa** amb el format de sota. Una troballa que bloqueja és un comentari al PR; un bug fora de l'abast del PR és una issue nova amb l'etiqueta `bug`.

## Llista de revisió

- Cada estat té resposta visible: càrrega (`Spinner` o esquelet), error (`Alert` amb el `details` del store), buit (missatge, no pantalla en blanc), èxit.
- Els tipus del store coincideixen amb l'esquema real del backend (`../backend/app/schemas/`): una diferència de nom, forma o mecanisme (cookie vs capçalera) és una troballa encara que els tests passin, i s'enllaça al repositori que l'ha de corregir.
- Les crides passen per `src/service/api.ts` amb rutes relatives `/api/...`; cap `fetch` directe ni URL absoluta.
- Accessibilitat: cada camp té etiqueta, els botons tenen nom, el focus és visible, el flux funciona només amb teclat, els missatges d'error s'anuncien (`role="status"` o `Alert`).
- Responsive: cap desplaçament horitzontal a 375 px, objectius tàctils còmodes, la composició canvia a escriptori en lloc d'estirar-se.
- Textos: concrets, sense promeses de rendiment ni de seguretat, en un sol idioma per vista, amb xifres monetàries formatades.
- HeroUI i tokens semàntics en lloc de colors fixos; cap dependència nova sense justificació i sense `package-lock.json` actualitzat.
- Cap secret ni URL interna (`http://backend:8000`) al codi ni a `VITE_*`.
- Cada criteri de la issue té un test a `tests/` que falla si el comportament es trenca.

## Format de l'informe

```
Issue #n — veredicte: APROVAT | BLOQUEJAT
1. <criteri> — PASSA | FALLA — evidència (test, ordre i sortida, o captura mòbil/escriptori)
2. ...
Troballes fora dels criteris: ...
Tests afegits: ...
```

Cada criteri porta veredicte i evidència; sense evidència no hi ha veredicte. Els bugs es redacten en català amb passos de reproducció, resultat esperat, resultat obtingut i amplada de pantalla.

## Límits

Treballes només amb entorns locals o de CI, mai contra producció ni amb comptes reals. Els tests simulen l'API: cap test depèn del backend en marxa.
