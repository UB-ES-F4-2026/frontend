# Instruccions per a agents — Frontend Fintech

Web React 19 + Vite en TypeScript, amb React Router 7, Tailwind CSS 4, HeroUI 3 i Zustand 5. L'API és el repositori germà `UB-ES-F4-2026/backend`, clonat a `../backend`: el seu `compose.yaml` arrenca web, API i base de dades, i Docker Compose s'executa des d'allà.

Llegeix [README.md](README.md) per a entorn, Watch, proxy `/api` i tests; [CI.md](CI.md) per reproduir la CI; [agents/product.md](agents/product.md) per a les regles de producte, contingut i disseny.

## Rols

Cada petició s'atén amb un rol. Tria'l per la feina que demana la tasca i llegeix el seu fitxer sencer abans de tocar res:

| Rol | Quan | Fitxer |
|---|---|---|
| Frontend | Pàgines, components, stores, crides a l'API, estils, textos | [agents/frontend.md](agents/frontend.md) |
| QA | Verificar una issue o PR, escriure o revisar tests, reportar bugs | [agents/qa.md](agents/qa.md) |
| DevOps | Dockerfiles, Caddy, CI, imatge de producció | [agents/devops.md](agents/devops.md) |

El rol Backend i la part de servidor de DevOps (Compose de producció, desplegament, incidències) són al repositori backend (`AGENTS.md` i `agents/`).

Per invocar-ne un: «Actua com a Frontend. Implementa la issue #23». Si la petició no diu rol, dedueix-lo i digues quin apliques. Són perfils de comportament, no processos: no cal llançar subagents perquè existeixin.

## Regles comunes

- Documentació, issues, PRs i comentaris de codi en català. Respon en l'idioma en què t'escriuen.
- Les issues són a GitHub: `gh issue view <n> -R UB-ES-F4-2026/frontend`. Una tasca comença llegint la seva issue i els criteris d'acceptació; el PR l'enllaça amb `Closes #n`. Una issue que afecta també el backend es referencia amb el nom complet (`UB-ES-F4-2026/backend#32`).
- Una branca per issue, `task/<n>-<descripció>`, amb PR cap a la branca `feat/…` de la història o del requisit. Les `feat` es fusionen a `dev`; a cada release es crea `release/x.y` des de `dev` i es fusiona a `main`. La CI de `.github/workflows/ci.yml` ha de passar abans de fusionar.
- Les crides a l'API usen rutes relatives `/api/...` a través de `src/service/api.ts`; el proxy de Vite i Caddy les reenvien al backend. Cap URL absoluta del backend al codi.
- Les variables `VITE_*` són visibles al navegador: només hi va configuració pública.
- `package-lock.json` es conserva i s'actualitza juntament amb `package.json` quan canvien les dependències; la imatge usa `npm ci`.
- La configuració local i les credencials són a `../backend/.env`: conserva'l, no el mostris, no el pugis. `docker compose down` sense `-v`.
- Abans d'`amend` o `rebase`, comprova branca i `HEAD` (`git branch --show-current`, `git log -1`): poden haver canviat des de l'última ordre.
- Commits i PRs sense atribució d'IA: cap `Co-Authored-By` d'assistent ni línia «Generated with …». Han de semblar escrits només per l'autor humà.
- Tanca cada tasca amb: què has canviat, com ho has comprovat (ordres i resultat) i què queda pendent.

## Proves unitàries

Abans d'afegir o modificar un comportament de frontend, llegeix
[`docs/qa/UNIT_TESTING.md`](docs/qa/UNIT_TESTING.md). Aquesta guia és
obligatòria per als rols Frontend i QA quan una tasca canvia comportament
observable.

Quan es consumeixi un endpoint nou, prova unitàriament la normalització de
dades, el store i els estats de càrrega, error i resposta obsoleta. Simula
`src/service/api.ts`; no facis peticions reals. Si la tasca comprova el
contracte amb l'API o recorre frontend i backend, afegeix una prova
d'integració o E2E, no l'etiquetis com a unitària.

## Proves d'integració

Abans de modificar un flux amb API, llegeix
[`docs/qa/INTEGRATION_TESTING.md`](docs/qa/INTEGRATION_TESTING.md). Les proves
noves són `tests/*.integration.test.tsx`: uneixen component, store, router i
`src/service/api.ts`, i només simulen `fetch`. Cada flux cobreix payload,
càrrega, èxit i error recuperable. Un E2E es reserva per recorreguts crítics
que travessen els dos repositoris.

## Proves funcionals

Abans d'implementar o canviar un criteri d'acceptació, llegeix
[`docs/qa/FUNCTIONAL_TESTING.md`](docs/qa/FUNCTIONAL_TESTING.md). Cada història
té un flux de Playwright a `e2e/flows/` on cada criteri és un `test.step`; el
flux registra el seu usuari i no depèn de cap altre. La fila del criteri a
[`docs/qa/TRACEABILITY.md`](docs/qa/TRACEABILITY.md) s'actualitza al mateix
canvi. Si l'aplicació no fa el que diu el criteri, no s'escriu un pas que
fixi el comportament incorrecte: s'obre una issue.
