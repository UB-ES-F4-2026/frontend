# Proves funcionals

Les proves funcionals comproven **què** fa el sistema, no com: cada cas surt
d'un criteri d'acceptació d'una història d'usuari i s'executa com ho faria una
persona, al navegador, contra el frontend, el backend i PostgreSQL reals. Són
la tercera capa, per sobre de les unitàries
([`UNIT_TESTING.md`](UNIT_TESTING.md)) i de les d'integració
([`INTEGRATION_TESTING.md`](INTEGRATION_TESTING.md)).

La relació entre cada criteri i la prova que el cobreix és a
[`TRACEABILITY.md`](TRACEABILITY.md).

## On són

- `e2e/flows/<nom>.flow.ts`: un fitxer per història d'usuari o recorregut. Cada
  fitxer exporta `register<Nom>Flow()`, que `e2e/home.spec.ts` registra.
- `e2e/support/`: comptes, saldo, imports i dades del seed. No hi va cap
  asserció de producte.
- Les dades inicials les crea `../backend/seed_e2e_testing_data.py`.

## Com s'escriu un flux

1. Parteix de la targeta de la història, no del codi. Cada criteri és un
   `test.step` amb l'identificador al títol, per exemple
   `US03.1.1 c5 · Aportación comprometida`.
2. Localitza els elements com una persona: rol, etiqueta i text visible en
   castellà. Cap selector de CSS ni `data-testid`.
3. Comprova el resultat observable: el missatge, l'import a «Mi saldo», el
   capital del detall, la presència o l'absència al catàleg.
4. Si l'aplicació fa una cosa diferent del que diu el criteri, **no escriguis
   un pas que fixi el comportament incorrecte**. Deixa el criteri sense cobrir,
   anota-ho a la matriu de traçabilitat i obre una issue amb l'etiqueta `bug`.

## Independència

Cada flux ha de passar executat sol, en qualsevol ordre, en paral·lel i
reintentat després d'una execució parcial (la CI reintenta dues vegades).

- Un flux que escriu **registra el seu usuari** a cada intent
  (`createAccount`, amb un correu únic) i s'ingressa exactament el saldo del
  criteri (`creditWallet`).
- Els comptes del seed (`e2e/support/seed.ts`) són de **només lectura**.
- Cada flux que compromet diners té la seva oportunitat sembrada. Les que
  s'esgoten en finançar-se tenen tres bessones, una per intent.
- Cap flux afirma un total que un altre pugui canviar (nombre d'oportunitats
  del catàleg, recomptes globals).

`creditWallet` ingressa saldo com ho fa Stripe: envia al webhook de producció
un pagament signat amb el secret d'un sol ús de l'entorn E2E
(`whsec_e2e_only_not_a_real_secret`, que no és cap secret real i no existeix a
staging ni a producció). No hi ha cap ruta només per a proves.

## Smoke i regressió

Els camins principals porten l'etiqueta `@smoke`: són la comprovació ràpida
que l'aplicació desplegada fa el més important.

```bash
npx playwright test --grep @smoke
```

La resta de passos són de regressió i s'executen sempre a la suite completa.

## Com s'executen

Des de `../backend`, sense instal·lar res a l'ordinador:

```bash
sh scripts/run-e2e.sh
```

Arrenca una base de dades buida, el backend, el frontend, el seed i
Playwright, i deixa l'informe a
`../backend/e2e-report/playwright-report/index.html`, també si alguna prova
falla. Els detalls de l'entorn són al `README.md` i al `CI.md` del repositori
`UB-ES-F4-2026/backend`.

La CI executa la suite completa a cada PR cap a `dev`, `release/*` i `main`
dels dos repositoris.

## Què no és una prova funcional

- Les matrius de validació d'un formulari, els estats de càrrega i els errors
  amb «Reintentar»: unitàries o d'integració.
- El pagament amb targeta de la US04.2: Stripe no és disponible a l'entorn
  E2E. El flux funcional cobreix la pantalla, la validació de l'import, la
  cancel·lació i l'accés sense sessió; el pagament es prova a
  `tests/WalletDeposit.integration.test.tsx` i al backend.
- La concurrència i la caducitat per rellotge: integració del backend.

## Abans d'obrir una PR

1. Si la PR implementa o canvia un criteri d'acceptació, afegeix o actualitza
   el pas del flux i la fila de [`TRACEABILITY.md`](TRACEABILITY.md).
2. Si el flux necessita dades noves, afegeix-les al seed del backend al mateix
   canvi.
3. Executa `sh scripts/run-e2e.sh` dues vegades seguides: zero proves fallades
   i zero inestables.
