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

## Què no és una prova unitària

Un recorregut entre frontend i backend és E2E. Una prova que uneix component,
store i servei HTTP simulat és d'integració i s'anomena `*.integration.test.tsx`.
No converteixis un E2E en una prova unitària simulant tota la implementació.

## Abans d'obrir la PR

Executa `npm run test:unit:coverage`, revisa l'informe de cobertura i deixa la
suite completa en verd. Si una funcionalitat toca API o navegació crítica,
afegeix també la prova d'integració o E2E que correspongui.
