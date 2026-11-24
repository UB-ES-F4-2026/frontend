# Proves d'integració

Les proves d'integració comproven que diverses peces reals col·laboren. No
substitueixen les unitàries ni els E2E: validen el límit entre pantalla, store,
router i client HTTP sense arrencar el backend real.

## Què és una prova d'integració

Una prova d'integració uneix pàgina o component, store, router i
`src/service/api.ts`. L'únic límit simulat és `fetch`; no se simula el store
sencer i no es fan peticions a un backend en marxa. Els fitxers nous es diuen
`tests/*.integration.test.tsx` i s'executen amb `npm run test:integration`.

`tests/Register.integration.test.tsx` i
`tests/Opportunities.integration.test.tsx` són les referències inicials:
construeixen el formulari o catàleg, el store i el servei HTTP reals, i
comproven petició, resposta i error recuperable. Els fluxos nous han de seguir
aquest patró, no copiar els tests unitaris que simulen el store.

Dues llibreries de tercers no es poden executar a jsdom i se substitueixen
només on cal, dient-ho al comentari de capçalera del fitxer: Stripe Elements
(`tests/WalletDeposit.integration.test.tsx`) i `react-leaflet`
(`tests/CreateOpportunity.integration.test.tsx`, amb
`tests/support/reactLeaflet.tsx`). Cap mòdul de `src/` se simula.

Quan cal tota l'aplicació (rutes privades, canvi de compte), es munta
`<SessionManager />` i `<App />` reals, com a
`tests/PrivateRoutes.integration.test.tsx`.

Les proves d'integració segueixen les mateixes regles d'independència que les
unitàries ([`UNIT_TESTING.md`](UNIT_TESTING.md#independència)) i la CI les
executa en ordre aleatori.

Per cada flux que consumeix API, cobreix com a mínim:

1. La petició: ruta, mètode, payload o consulta i credencials quan apliqui.
2. L'estat de càrrega i la prevenció d'enviaments duplicats.
3. La resposta correcta i la navegació o actualització d'estat visible.
4. Un error recuperable de l'API, mantenint les dades que l'usuari pugui
   corregir.

## Contractes amb backend

Si una PR crea o canvia un endpoint, el frontend prova el payload que envia i
la forma de resposta que consumeix. El backend, amb FastAPI i PostgreSQL
temporal reals, prova l'autenticació, validació, persistència i rollback.
El mateix camp ha de tenir el mateix nom i significat als dos repositoris.

No es duplica aquest cas en Playwright: un E2E només cobreix un recorregut
crític complet que travessa frontend, backend i base de dades.

## CI i mètriques

- `npm run test:unit:coverage` mesura cobertura de línies, branques, funcions
  i sentències dels fitxers unitaris.
- `npm run test:integration` és un check obligatori i informa de fluxos,
  càrrega, error i contracte coberts; no té un llindar global de cobertura.
- Playwright mesura fluxos crítics, temps i inestabilitat.

Un timeout llarg no corregeix un test inestable. El test s'ha de fer
determinista o marcar-se com a incidència coneguda amb una justificació.

## Abans d'obrir una PR

1. Assigna cada criteri d'acceptació a una prova unitària, d'integració o E2E.
2. Executa `npm run test:integration` després de canviar un flux amb API.
3. Si canvia un contracte, enllaça la issue o PR del backend i verifica el
   payload real del frontend.
