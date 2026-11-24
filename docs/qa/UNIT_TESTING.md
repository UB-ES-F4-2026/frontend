# Proves unitàries

Les proves unitàries validen stores, utilitats, hooks i components petits sense
backend real ni navegador real. La CI executa `npm run test:unit:coverage` i
publica cobertura de línies, branques, funcions i sentències.

## On posar-les

- Els fitxers unitaris són `tests/*.test.ts` o `tests/*.test.tsx`.
- Els fitxers amb integració interna es diuen `*.integration.test.tsx` i no
  formen part de `npm run test:unit`.
- Per provar un store, simula `src/service/api.ts`; no facis `fetch` real.
- Per provar un component, simula només les dependències externes i comprova
  textos, rols, navegació i estats visibles.

## Què ha de provar una PR

Per cada comportament nou o canviat, afegeix:

1. El flux correcte.
2. Càrrega, error i estat buit quan existeixin.
3. Límits de dades, navegació i respostes asíncrones obsoletes quan apliqui.

Les proves han de ser deterministes: usa dades pròpies, rellotges falsos i mocks
explícits. No depenguis del nombre de dades compartides ni de l'ordre de xarxa.

## Independència

Cap prova pot dependre d'una altra. Una prova ha de passar executada sola, en
qualsevol ordre i repetida, i no pot deixar res que canviï el resultat d'una
altra.

- Els stores de Zustand són únics per fitxer i no es restableixen sols:
  `useXStore.setState(useXStore.getInitialState(), true)` a `beforeEach`.
- `vi.resetAllMocks()` i no `vi.clearAllMocks()`, que conserva les respostes
  `mockResolvedValueOnce` pendents d'una prova anterior.
- El que es canvia de global es restaura a `afterEach`: `vi.unstubAllGlobals()`,
  `vi.useRealTimers()`, `localStorage`, oients de `window`.
- Cap variable de mòdul assignada dins d'una prova.

La CI executa les proves unitàries i d'integració amb `--sequence.shuffle`, que
barreja fitxers i proves. Vitest escriu la llavor al registre; per reproduir un
error d'ordre en local:

```bash
npx vitest run --sequence.shuffle --sequence.seed=<llavor>
```

## Què no és una prova unitària

Un recorregut entre frontend i backend és E2E. Una prova que uneix component,
store i servei HTTP simulat és d'integració i s'anomena `*.integration.test.tsx`.
No converteixis un E2E en una prova unitària simulant tota la implementació.

## Abans d'obrir la PR

Executa `npm run test:unit:coverage`, revisa l'informe de cobertura i deixa la
suite completa en verd. Si una funcionalitat toca API o navegació crítica,
afegeix també la prova d'integració o E2E que correspongui.
