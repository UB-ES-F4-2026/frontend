# Traçabilitat: criteris d'acceptació → proves

Per a cada història d'usuari implementada a `dev`, quina prova cobreix cada
criteri i a quina capa. Els criteris són els de les targetes del Trello; els
números (`c1`, `CA04`) són els de cada targeta.

- **Funcional**: flux de Playwright a `e2e/flows/`
  ([`FUNCTIONAL_TESTING.md`](FUNCTIONAL_TESTING.md)).
- **Integració**: `tests/*.integration.test.tsx` d'aquest repositori (F) i
  `tests/test_*.py` amb PostgreSQL del repositori backend (B)
  ([`INTEGRATION_TESTING.md`](INTEGRATION_TESTING.md)).
- **Unitària**: `tests/*.test.ts(x)` (F) i `tests/test_*_unit.py` (B)
  ([`UNIT_TESTING.md`](UNIT_TESTING.md)).

Quan una PR implementa o canvia un criteri, actualitza la seva fila.

## Autenticació i sessió

| Història | Criteris | Funcional | Integració | Unitària |
|---|---|---|---|---|
| US01.1 Crear el meu compte | tots | `auth.flow` | F `Register.integration` · B `test_auth` | F `Register`, `validatePersonalDetails`, `validateAccessDetails` · B `test_auth_schemas_unit` |
| US01.2 Identificar-me | tots | `auth.flow` (login correcte i contrasenya incorrecta) | F `Login.integration` · B `test_auth` | F `Login`, `useAuthStore` · B `test_security_unit` |
| US01.6 Registre en dues pantalles | CA01, CA03, CA07 | `auth.flow` | F `Register.integration` | F `Register` |
| | CA02, CA05, CA06, CA08 | — (matriu de validació) | F `Register.integration` (errors 409, 422, 500 i xarxa) | F `Register`, `LegalDocuments`, validadors |
| | CA04 | — | F `Register.integration` · B `test_auth` | — |
| US01.8 Tancar sessió | CA04, CA06, CA07, CA08, CA09 | `session.flow` | F `Session.integration`, `PrivateRoutes.integration` · B `test_session_protection_integration` | F `Header`, `useAuthStore` |
| | CA10 | — (rellotge) | B `test_session_protection_integration`, `test_auth` | B `test_session_helpers_unit` |
| TR05 Sessió amb cookie | c1, c2, c4, c5, c6 | `session.flow` | F `Session.integration` · B `test_session_protection_integration`, `test_route_protection` | B `test_security_unit` |
| | c3 (caducitat lliscant) | — (rellotge) | B `test_auth`, `test_sessions` | B `test_session_helpers_unit` |
| US01.9 Registre com a entitat promotora | c1–c6 | `promoter-registration.flow` | F `Register.integration` · B `test_auth`, `test_opportunity_lifecycle_integration` | F `validatePromotingEntity`, `Register` · B `test_auth_schemas_unit` |
| BUG03 «Crear cuenta» amb sessió | — | `session.flow` | F `Login.integration` | F `HomePage` |

## Catàleg i detall

| Història | Criteris | Funcional | Integració | Unitària |
|---|---|---|---|---|
| US02.1 Llista d'oportunitats | c1, c2 (nom, tipus, capital), c3, c4 | `catalog.flow` | F `Opportunities.integration` · B `test_opportunities`, `test_opportunity_lifecycle_integration` | F `Opportunities`, `useOpportunityStore` · B `test_funding_status_unit` |
| | c5 (catàleg buit) | — (el seed mai deixa el catàleg buit) | B `test_opportunities` | F `Opportunities` |
| US02.3.1 Cerca per nom | CA01, CA02, CA03, CA05 (buit), CA06, CA07, CA11 | `catalog.flow` | F `Opportunities.integration` · B `test_opportunity_search` | F `Opportunities` · B `test_name_search` |
| US02.3.2 Filtre per tipus | c1–c5 | `catalog.flow` | F `Opportunities.integration` · B `test_opportunity_search` | F `Opportunities` |
| US02.2.1 Detall immobiliari | contingut, accés per enllaç, finançada, vençuda | `real-estate-detail.flow`, `real-estate-investment.flow` | F `RealEstateDetail.integration` · B `test_opportunity_detail`, `test_opportunity_media_integration` | F `RealEstate` |
| US02.2.2 Detall empresarial | c1–c7 | `business-detail.flow`, `funding-completion.flow` (c6, desactivat) | F `BusinessDetail.integration` · B `test_business_opportunity_detail` | F `BusinessDetail` |

## Saldo

| Història | Criteris | Funcional | Integració | Unitària |
|---|---|---|---|---|
| US04.1 Consultar el saldo | accés, format, saldo zero i saldo de prova | `balance.flow`, `my-investments.flow` | F `MyWallet.integration`, `PrivateRoutes.integration` (canvi de compte) · B `test_wallet_balance`, `test_session_protection_integration` | F `MyWalletPage`, `useWalletStore` |
| | càrrega, error i «Reintentar» | — | F `MyWallet.integration` | F `MyWalletPage` |
| US04.2 Afegir fons | c1, c2, c5 («Cancelar»), c6 | `wallet-deposit.flow` | F `WalletDeposit.integration` | F `depositAmount`, `WalletDeposit` |
| | c3, c4, c5 («Volver») | — (Stripe no és a l'entorn E2E) | F `WalletDeposit.integration` · B `test_stripe_webhook_integration`, `test_stripe_wallet`, `test_money_journey_integration` | F `WalletDeposit`, `useWalletStore` |
| US04.3 Retirar fons | c1–c8 | `wallet-withdrawal.flow` | F `WalletWithdrawal.integration` · B `test_withdrawals`, `test_wallet_flows_integration` | F `withdrawalForm`, `iban`, `WalletWithdrawal` |

## Compromisos

| Història | Criteris | Funcional | Integració | Unitària |
|---|---|---|---|---|
| US03.1.1 Aportació immobiliària | c1–c5, c8 | `real-estate-commitment.flow` | F `CommitContribution.integration` · B `test_opportunity_commitments`, `test_money_journey_integration` | F `contributionAmount`, `CommitContribution` |
| | c6, c7, c9 | `funding-completion.flow` | F `CommitContribution.integration` (409) · B `test_opportunity_commitments`, `test_commitments` | B `test_funding_status_unit` |
| US03.1.2 Inversió empresarial | c1–c6, c9 | `business-investment.flow` | F `CommitInvestment.integration` · B `test_opportunity_commitments` | F `contributionAmount`, `CommitInvestment` · B `test_commitments_unit` |
| | c7, c10 | `funding-completion.flow` | B `test_opportunity_commitments` | — |
| | c8 | — (mateix diàleg i ruta que US03.1.1 c7) | F `CommitInvestment.integration` · B `test_opportunity_commitments` | F `CommitInvestment` |
| SPK02 Aportacions simultànies | — | — | B `test_opportunity_commitments`, `test_commitments`, `test_wallet_flows_integration` | — |

## Entitat promotora i cartera

| Història | Criteris | Funcional | Integració | Unitària |
|---|---|---|---|---|
| US05.1 Les meves inversions | c1–c9 | `my-investments.flow`; c6 també als dos fluxos de creació | F `MyInvestments.integration` · B `test_user_commitments` | F `MyInvestments` |
| US05.2 Les meves oportunitats | c1–c7 | `my-opportunities.flow` | F `MyOpportunities.integration`, `PrivateRoutes.integration` · B `test_promoter_opportunities` | F `MyOpportunities`, `Header` |
| US06.1.1 Crear oportunitat immobiliària | c1–c8 | `create-real-estate-opportunity.flow` | F `CreateOpportunity.integration` · B `test_opportunities`, `test_real_estate_opportunities`, `test_opportunity_lifecycle_integration`, `test_opportunity_media_integration` | F `opportunityDraft`, `realEstateDraft`, `RealEstateStep`, `CreateOpportunity` · B `test_media_unit`, `test_auth_schemas_unit` |
| US06.1.2 Crear oportunitat empresarial | c1–c3, c5–c8 | `create-business-opportunity.flow` | F `CreateOpportunity.integration` · B `test_opportunities`, `test_money_journey_integration` | F `businessDraft`, `BusinessStep` |
| | c4, c9 | — (component compartit, provat al flux immobiliari) | F `CreateOpportunity.integration` | F `opportunityDraft`, `CreateOpportunity` |

## Criteris sense prova funcional

### No implementats

Cap prova els cobreix perquè el comportament no existeix a `dev`.

| Història | Criteri | Estat |
|---|---|---|
| US01.8 | CA01–CA03: menú de compte a escriptori i a mòbil | «Cerrar sesión» és un botó de la capçalera a totes les amplades |
| US01.8 | CA11: procés periòdic que elimina sessions caducades | Una sessió caducada només s'elimina quan es torna a presentar |
| US01.8 | CA12: comprovació periòdica i en reprendre, amb missatge d'expiració | El frontend només reacciona a un `401` |
| US02.3.1 | CA05: límit de 100 caràcters | Sense validació al formulari; el backend n'accepta 255 |
| US02.3.1 | CA09: `q` a la URL, recàrrega i historial | La cerca viu a l'estat del component |
| US02.3.1 | CA16–CA21: paginació | No existeix ni a l'API ni a la interfície |

### L'aplicació no fa el que diu el criteri

No s'ha escrit cap pas que fixi el comportament actual. Cada fila necessita una
issue o una decisió de producte sobre la targeta.

| Història | Criteri | Comportament actual |
|---|---|---|
| US01.8 | CA05: pàgina amb «Has cerrado la sesión» | Redirigeix a `/login` sense missatge |
| US01.8 | CA13: si el logout falla, es neteja l'estat local | La sessió es conserva i es mostra «No se ha podido cerrar sesión. Inténtalo de nuevo.» |
| US02.1 | c2: percentatge finançat i data límit a la targeta | Barra sense xifra i «N días restantes» |
| US02.3.1 | CA04: `%` i `_` es cerquen literalment | Es descarten com a puntuació |
| US02.3.1 | CA08: «Limpiar búsqueda» | No hi ha cap control amb aquest text |
| US02.3.1 | CA12: «Reintentar» conserva la cerca | Torna a demanar el catàleg sense filtres mentre el camp i el selector encara els mostren |
| US02.2.1 | Detall consultable sense sessió | Des del catàleg un visitant rep «Inicia sesión para ver los detalles»; l'enllaç directe sí que el mostra |
| US02.2.1 | «Mapa no disponible» sense coordenades | Es dibuixa un mapa a 0,0 |
| US02.2.1 | «Viviendas previstas» només per a residencial i mixt | Es mostra sempre, amb «0» quan no n'hi ha |
| US02.2.1 | «Tipo de inmueble» | No es mostra |
| US02.2.1 | Galeria amb totes les imatges | Només es veu la portada |
| US02.2.1 | «Oportunidad no disponible» | Un `404` es presenta com a error de càrrega amb «Reintentar» |
| US02.2.1 / US02.2.2 | Indicador «Oportunidad cerrada» | El detall d'una oportunitat tancada mostra «En financiación» i «Quiero invertir» actiu |
| US05.2 | c3: capital compromès del resum | Just després d'enviar una oportunitat amb aportació inicial, el resum mostra 0,00 € i la targeta 5.000,00 € |
| US05.2 | c7: missatge de llista buida | «Aún no has publicado ninguna oportunidad» apareix amb oportunitats pendents a la llista |

### A una capa inferior per decisió

| Què | Per què | On es prova |
|---|---|---|
| Pagament amb targeta (US04.2 c3, c4) | Stripe no és a l'entorn E2E | `WalletDeposit.integration`, `test_stripe_webhook_integration` |
| Caducitat de la sessió per inactivitat (TR05 c3, US01.8 CA10) | Depèn del rellotge | `test_auth`, `test_session_protection_integration` |
| Matrius de validació, càrrega i errors amb «Reintentar» | Molts casos, cap recorregut nou | Proves unitàries i d'integració de cada pàgina |
| Concurrència (SPK02) | No es pot provocar des del navegador | `test_opportunity_commitments`, `test_wallet_flows_integration` |

## Mètrica de cobertura per criteri

Mesura feta el 24/11/2026 sobre `dev` (frontend `9432fe9`, backend `adb2eb1`), amb els
criteris de les targetes del Trello. Per a cada criteri i cada capa:

- **Completa**: hi ha comprovacions per a totes les clàusules del criteri.
- **Parcial**: n'hi ha per a alguna clàusula, però no per a totes.
- **—**: cap prova de la capa en comprova cap clàusula.

Una prova que fixa un comportament contrari al criteri no compta. Les 743 cites de proves
s'han comprovat mecànicament contra el codi; el nivell assignat és un judici de lectura,
aplicat amb criteri estricte, no el resultat d'una execució. Cap flux funcional fa servir una
amplada de mòbil, de manera que els criteris que parlen de mòbil o de 320 px queden com a
màxim en parcial.

### Resum per targeta

Cada cel·la és completa / parcial / cap, i entre parèntesis el percentatge de criteris amb
cobertura completa a la capa.

| Targeta | Criteris | Unitària | Integració | Funcional | Completa en alguna capa | Sense cap prova |
|---|---:|---|---|---|---:|---:|
| US01.1 Crear el meu compte | 3 | 1 / 2 / 0 (33 %) | 3 / 0 / 0 (100 %) | 1 / 1 / 1 (33 %) | 3 (100 %) | 0 |
| US01.2 Identificar-me | 2 | 0 / 2 / 0 (0 %) | 2 / 0 / 0 (100 %) | 2 / 0 / 0 (100 %) | 2 (100 %) | 0 |
| US01.6 Registre en dues pantalles | 9 | 5 / 3 / 1 (56 %) | 3 / 4 / 2 (33 %) | 1 / 2 / 6 (11 %) | 7 (78 %) | 1 |
| US01.8 Tancar sessió | 13 | 0 / 2 / 11 (0 %) | 5 / 3 / 5 (38 %) | 4 / 2 / 7 (31 %) | 6 (46 %) | 5 |
| TR05 Sessió amb token | 6 | 0 / 3 / 3 (0 %) | 4 / 2 / 0 (67 %) | 4 / 1 / 1 (67 %) | 4 (67 %) | 0 |
| US01.9 Registre com a entitat promotora | 6 | 4 / 2 / 0 (67 %) | 4 / 1 / 1 (67 %) | 6 / 0 / 0 (100 %) | 6 (100 %) | 0 |
| BUG03 «Crear cuenta» amb sessió | 1 | 1 / 0 / 0 (100 %) | 1 / 0 / 0 (100 %) | 1 / 0 / 0 (100 %) | 1 (100 %) | 0 |
| US02.1 Llista d'oportunitats | 5 | 1 / 2 / 2 (20 %) | 3 / 1 / 1 (60 %) | 3 / 1 / 1 (60 %) | 4 (80 %) | 0 |
| US02.3.1 Cerca per nom | 21 | 1 / 11 / 9 (5 %) | 0 / 11 / 10 (0 %) | 4 / 5 / 12 (19 %) | 5 (24 %) | 9 |
| US02.3.2 Filtre per tipus | 5 | 2 / 3 / 0 (40 %) | 5 / 0 / 0 (100 %) | 4 / 1 / 0 (80 %) | 5 (100 %) | 0 |
| US02.2.1 Detall immobiliari | 6 | 1 / 3 / 2 (17 %) | 1 / 5 / 0 (17 %) | 2 / 2 / 2 (33 %) | 3 (50 %) | 0 |
| US02.2.2 Detall empresarial | 7 | 6 / 1 / 0 (86 %) | 3 / 4 / 0 (43 %) | 5 / 2 / 0 (71 %) | 7 (100 %) | 0 |
| US04.1 Consultar el saldo | 12 | 4 / 7 / 1 (33 %) | 9 / 2 / 1 (75 %) | 2 / 6 / 4 (17 %) | 9 (75 %) | 0 |
| US04.2 Afegir fons | 6 | 6 / 0 / 0 (100 %) | 3 / 3 / 0 (50 %) | 3 / 1 / 2 (50 %) | 6 (100 %) | 0 |
| US04.3 Retirar fons | 8 | 8 / 0 / 0 (100 %) | 4 / 2 / 2 (50 %) | 8 / 0 / 0 (100 %) | 8 (100 %) | 0 |
| US03.1.1 Aportació immobiliària | 9 | 8 / 1 / 0 (89 %) | 4 / 4 / 1 (44 %) | 7 / 2 / 0 (78 %) | 9 (100 %) | 0 |
| US03.1.2 Inversió empresarial | 10 | 9 / 1 / 0 (90 %) | 1 / 7 / 2 (10 %) | 6 / 3 / 1 (60 %) | 10 (100 %) | 0 |
| US05.1 Les meves inversions | 9 | 8 / 1 / 0 (89 %) | 4 / 4 / 1 (44 %) | 9 / 0 / 0 (100 %) | 9 (100 %) | 0 |
| US05.2 Les meves oportunitats | 7 | 6 / 1 / 0 (86 %) | 4 / 3 / 0 (57 %) | 6 / 1 / 0 (86 %) | 7 (100 %) | 0 |
| US06.1.1 Crear oportunitat immobiliària | 8 | 5 / 3 / 0 (62 %) | 2 / 5 / 1 (25 %) | 4 / 4 / 0 (50 %) | 7 (88 %) | 0 |
| US06.1.2 Crear oportunitat empresarial | 9 | 6 / 3 / 0 (67 %) | 1 / 7 / 1 (11 %) | 5 / 4 / 0 (56 %) | 8 (89 %) | 0 |
| **Total** | 162 | 82 / 51 / 29 (51 %) | 66 / 68 / 28 (41 %) | 87 / 38 / 37 (54 %) | 126 (78 %) | 15 |
| Només criteris implementats | 151 | 82 / 51 / 18 (54 %) | 66 / 68 / 17 (44 %) | 87 / 38 / 26 (58 %) | 126 (83 %) | 4 |
| Targetes del sprint 2 | 76 | 61 / 15 / 0 (80 %) | 32 / 36 / 8 (42 %) | 57 / 16 / 3 (75 %) | 74 (97 %) | 0 |

### Què falta

- **Criteris implementats sense cap prova**: US01.6 CA09 i US02.3.1 CA13 (disseny adaptable),
  US01.8 CA02 i US02.3.1 CA04 (`%` i `_` literals, on l'aplicació fa el contrari).
- **Sprint 2 sense cobertura completa a cap capa**: US06.1.1 c4 i US06.1.2 c4. Cap prova
  intenta una aportació mínima no positiva.
- **Integració del diàleg d'inversió**: a la US03.1.2 només un criteri de deu és complet a
  integració. L'API està provada, però el diàleg gairebé no es comprova amb la pàgina i el
  store reals.
- **Funcional**: US04.2 c3 i c4 (pagament amb targeta) i US03.1.2 c8 no tenen pas funcional.

### Detall per criteri

A cada cel·la, el nivell i la primera prova que el sosté; `(+n)` indica que n'hi ha més.

#### US01.1 Crear el meu compte

| Criteri | Implementat | Unitària | Integració | Funcional |
|---|---|---|---|---|
| c1 | Sí | **Parcial** · `Register.test.tsx` › redirigeix a /login quan el registre retorna l’usuari creat (+1) | **Completa** · `test_auth.py` › test_register_login_and_me (+1) | **Completa** · `auth.flow.ts` › 3. Completar Paso 2 (Datos de acceso) y crear la cuenta (+1) |
| c2 | Sí | **Completa** · `validatePersonalDetails.test.ts` › rebutja el correu invàlid: %s (+2) | **Completa** · `test_auth.py` › test_invalid_registration_data (+2) | **Parcial** · `promoter-registration.flow.ts` › US01.9 c4 · Con la razón social vacía o un año no válido, «Continua… |
| c3 | Sí | **Parcial** · `useAuthStore.test.ts` › distingeix el 409 «%s» (+1) | **Completa** · `test_auth.py` › test_duplicate_email_is_rejected (+1) | — |

#### US01.2 Identificar-me

| Criteri | Implementat | Unitària | Integració | Funcional |
|---|---|---|---|---|
| c1 | Sí | **Parcial** · `Login.test.tsx` › envia les credencials i redirigeix a l’inici quan s’inicia la sessió (+2) | **Completa** · `test_auth.py` › test_register_login_and_me (+1) | **Completa** · `auth.flow.ts` › 5. Iniciar sesión con las credenciales registradas y redirigir al i… |
| c2 | Sí | **Parcial** · `Login.test.tsx` › mostra l’error del store i conserva el formulari (+2) | **Completa** · `test_auth.py` › test_failed_login_creates_no_session_or_cookie (+1) | **Completa** · `auth.flow.ts` › 4. Rechazar intento de login con contraseña incorrecta |

#### US01.6 Registre en dues pantalles

| Criteri | Implementat | Unitària | Integració | Funcional |
|---|---|---|---|---|
| CA01 | Sí | **Completa** · `App.test.tsx` › mostra la pàgina corresponent a %s dins de main (+2) | **Parcial** · `Register.integration.test.tsx` › un 422 d'un camp de l'entitat es tradueix, conserva les dades i per… (+1) | **Completa** · `auth.flow.ts` › 1. Navegar al registro desde la barra de navegación principal (+1) |
| CA02 | Sí | **Completa** · `validatePersonalDetails.test.ts` › valida independentment cada nom invàlid: %s (+2) | **Parcial** · `test_auth.py` › test_register_rejects_phone_with_invalid_format (+2) | — |
| CA03 | Sí | **Completa** · `Register.test.tsx` › conserva tots els camps i les caselles en anar enrere i avançar, se… (+1) | **Completa** · `Register.integration.test.tsx` › conserva el formulari després de l’error %s i permet corregir i rei… | **Parcial** · `auth.flow.ts` › 2. Completar Paso 1 (Datos personales) y verificar persistencia ent… (+1) |
| CA04 | Sí | **Parcial** · `test_auth_schemas_unit.py` › test_registration_normalizes_email_last_name_and_phone (+2) | **Completa** · `test_auth.py` › test_duplicate_email_is_rejected (+1) | — |
| CA05 | Sí | **Completa** · `validateAccessDetails.test.ts` › rebutja una contrasenya %s (+2) | **Parcial** · `test_auth.py` › test_invalid_registration_data (+1) | — |
| CA06 | Sí | **Completa** · `LegalDocuments.test.tsx` › %s mostra el contingut i identifica que és un borrador (+2) | — | — |
| CA07 | Parcial | **Parcial** · `Register.test.tsx` › admet contrasenyes ASCII sense exigir combinacions ni retallar espa… (+2) | **Parcial** · `Register.integration.test.tsx` › envia el telèfon de %s: %s com %s (+2) | **Parcial** · `auth.flow.ts` › 3. Completar Paso 2 (Datos de acceso) y crear la cuenta (+2) |
| CA08 | Sí | **Parcial** · `useAuthStore.test.ts` › tradueix l’error %s sense exposar text ni dades del servidor (+2) | **Completa** · `Register.integration.test.tsx` › conserva el formulari després de l’error %s i permet corregir i rei… (+1) | — |
| CA09 | Sí | — | — | — |

#### US01.8 Tancar sessió

| Criteri | Implementat | Unitària | Integració | Funcional |
|---|---|---|---|---|
| CA01 | No | — | — | — |
| CA02 | Parcial | — | — | — |
| CA03 | No | — | — | — |
| CA04 | Sí | — | **Completa** · `test_auth.py` › test_logout_deletes_session_and_cookie (+2) | **Completa** · `session.flow.ts` › US01.8 CA04 y TR05 c5 · «Cerrar sesión» no pide confirmación, borra… |
| CA05 | Parcial | — | **Parcial** · `Session.integration.test.tsx` › tancar sessió bloqueja el botó mentre espera i envia un sol POST se… | **Parcial** · `auth.flow.ts` › 6. Cerrar sesión desde el Header y volver a /login |
| CA06 | Sí | — | **Completa** · `PrivateRoutes.integration.test.tsx` › un visitant a %s acaba al login sense demanar cap dada privada | **Completa** · `session.flow.ts` › US01.8 CA06 y BUG03 · Un visitante no ve «Cerrar sesión» y la págin… |
| CA07 | Sí | **Parcial** · `App.test.tsx` › porta el visitant al login sense mostrar la pàgina | **Parcial** · `PrivateRoutes.integration.test.tsx` › en tancar sessió desapareix el saldo, i el compte següent només veu… (+2) | **Completa** · `session.flow.ts` › US01.8 CA07 · Volver atrás no recupera la sesión ni muestra conteni… (+1) |
| CA08 | Sí | — | **Completa** · `Session.integration.test.tsx` › el logout amb sessió ja caducada també acaba al login (+2) | **Parcial** · `session.flow.ts` › US01.8 CA08 · Repetir el cierre desde otra pestaña no restaura la s… |
| CA09 | Sí | — | **Completa** · `test_session_protection_integration.py` › test_user_can_log_in_again_after_logout (+1) | **Completa** · `session.flow.ts` › US01.8 CA09 y BUG03 · Se puede volver a entrar y, al salir, la pági… |
| CA10 | Sí | **Parcial** · `test_session_helpers_unit.py` › test_expired_session_clears_the_secure_http_only_cookie | **Completa** · `test_auth.py` › test_expired_session_is_unauthorized (+2) | — |
| CA11 | No | — | — | — |
| CA12 | No | — | — | — |
| CA13 | Parcial | — | **Parcial** · `Session.integration.test.tsx` › un error de xarxa en comprovar la sessió deixa el visitant on era, … (+1) | — |

#### TR05 Sessió amb token

| Criteri | Implementat | Unitària | Integració | Funcional |
|---|---|---|---|---|
| c1 | Sí | **Parcial** · `test_security_unit.py` › test_generated_tokens_are_url_safe_and_unique | **Completa** · `test_auth.py` › test_login_creates_session_and_sets_secure_cookie (+1) | **Completa** · `session.flow.ts` › TR05 c1 y c6 · El inicio de sesión entrega el token en una cookie H… |
| c2 | Sí | — | **Completa** · `test_auth.py` › test_missing_or_invalid_token_is_unauthorized (+1) | **Completa** · `session.flow.ts` › TR05 c2 · Sin token o con un token inválido, las rutas protegidas r… |
| c3 | Sí | **Parcial** · `test_session_helpers_unit.py` › test_touch_replaces_the_existing_expiry (+1) | **Parcial** · `test_auth.py` › test_valid_request_renews_expiry_to_now_plus_60_minutes (+1) | — |
| c4 | Sí | **Parcial** · `api.test.ts` › normalitza els errors HTTP i emet una sessió caducada fora del login | **Parcial** · `test_auth.py` › test_expired_session_is_unauthorized (+2) | **Parcial** · `session.flow.ts` › TR05 c4 · Con el token ya invalidado en el servidor, la siguiente a… |
| c5 | Sí | — | **Completa** · `test_auth.py` › test_logout_deletes_session_and_cookie (+1) | **Completa** · `session.flow.ts` › US01.8 CA04 y TR05 c5 · «Cerrar sesión» no pide confirmación, borra… |
| c6 | Sí | — | **Completa** · `test_auth.py` › test_token_never_appears_in_url_or_body (+2) | **Completa** · `session.flow.ts` › TR05 c1 y c6 · El inicio de sesión entrega el token en una cookie H… |

#### US01.9 Registre com a entitat promotora

| Criteri | Implementat | Unitària | Integració | Funcional |
|---|---|---|---|---|
| c1 | Sí | **Completa** · `Register.test.tsx` › 1. mostra la casella desmarcada per defecte, amb la seva explicació… | — | **Completa** · `promoter-registration.flow.ts` › US01.9 c1 · La casilla «Registrarme como entidad promotora» está de… |
| c2 | Sí | **Completa** · `Register.test.tsx` › 2. en marcar-la mostra els camps sota la casella: raó social obliga… (+1) | **Completa** · `Register.integration.test.tsx` › envia la ubicació de l'entitat quan s'ha escrit i l'any com a null … (+2) | **Completa** · `promoter-registration.flow.ts` › US01.9 c2 · Al marcarla aparecen «Razón social» (obligatorio), «Año… |
| c3 | Sí | **Completa** · `Register.test.tsx` › 3. en desmarcar-la amaga els camps, oblida els errors i no envia le… (+1) | **Completa** · `Register.integration.test.tsx` › en desmarcar la casella no envia 'promoting_entity' encara que s'ha… | **Completa** · `promoter-registration.flow.ts` › US01.9 c3 · Al desmarcarla los campos desaparecen y el registro no … |
| c4 | Sí | **Completa** · `Register.test.tsx` › 4. amb %s no passa al pas 2 i mostra l'error sota el camp (+2) | **Parcial** · `test_auth.py` › test_register_promoter_requires_legal_name (+1) | **Completa** · `promoter-registration.flow.ts` › US01.9 c4 · Con la razón social vacía o un año no válido, «Continua… |
| c5 | Sí | **Parcial** · `Register.test.tsx` › 5. envia el compte i l'entitat junts, normalitzats, i redirigeix al… (+2) | **Completa** · `test_auth.py` › test_register_promoter_and_identify_account_after_login (+2) | **Completa** · `promoter-registration.flow.ts` › US01.9 c5 · Completar los dos pasos con la casilla marcada crea la … (+1) |
| c6 | Sí | **Parcial** · `Register.test.tsx` › 6. el registre normal envia les mateixes dades que abans, sense ent… (+1) | **Completa** · `test_auth.py` › test_register_login_and_me (+2) | **Completa** · `promoter-registration.flow.ts` › US01.9 c6 · La cuenta normal no tiene «Mis oportunidades» y la secc… |

#### BUG03 «Crear cuenta» amb sessió

| Criteri | Implementat | Unitària | Integració | Funcional |
|---|---|---|---|---|
| — | Sí | **Completa** · `HomePage.test.tsx` › amb sessió iniciada no ofereix «Crear cuenta» però manté «Ver oport… | **Completa** · `Login.integration.test.tsx` › un compte %s | **Completa** · `session.flow.ts` › BUG03 · Con sesión iniciada, la página de inicio no muestra «Crear … |

#### US02.1 Llista d'oportunitats

| Criteri | Implementat | Unitària | Integració | Funcional |
|---|---|---|---|---|
| c1 | Sí | **Parcial** · `App.test.tsx` › mostra la pàgina corresponent a %s dins de main | **Completa** · `test_opportunity_search.py` › test_without_name_returns_the_whole_catalog (+2) | **Completa** · `catalog.flow.ts` › US02.1 c1 · El catálogo es accesible sin sesión desde la página de … |
| c2 | Parcial | **Parcial** · `Opportunities.test.tsx` › renderiza la lista de tarjetas de oportunidades cuando la petición … (+1) | **Parcial** · `Opportunities.integration.test.tsx` › carrega el catàleg i envia la cerca real al servei HTTP (+1) | **Parcial** · `catalog.flow.ts` › US02.1 c2 · Cada oportunidad muestra su nombre, el tipo de activo, … |
| c3 | Sí | — | **Completa** · `test_opportunities.py` › test_catalog_includes_only_available_opportunities (+2) | **Completa** · `catalog.flow.ts` › US02.1 c3 y c4 · No aparecen las oportunidades en borrador, rechaza… |
| c4 | Sí | — | **Completa** · `test_opportunities.py` › test_catalog_includes_only_available_opportunities (+2) | **Completa** · `catalog.flow.ts` › US02.1 c3 y c4 · No aparecen las oportunidades en borrador, rechaza… (+1) |
| c5 | Sí | **Completa** · `Opportunities.test.tsx` › muestra un mensaje alternativo cuando no hay oportunidades publicadas (+1) | — | — |

#### US02.3.1 Cerca per nom

| Criteri | Implementat | Unitària | Integració | Funcional |
|---|---|---|---|---|
| CA01 | Sí | **Parcial** · `Opportunities.test.tsx` › renderiza el buscador con su etiqueta, campo, botón y texto de ayuda | **Parcial** · `Opportunities.integration.test.tsx` › carrega el catàleg i envia la cerca real al servei HTTP | **Completa** · `catalog.flow.ts` › US02.3.1 CA01 y US02.3.2 c1 · Sin sesión hay buscador en castellano… (+1) |
| CA02 | Sí | **Parcial** · `Opportunities.test.tsx` › escribir en el campo no lanza ninguna búsqueda hasta pulsar el botón (+2) | **Parcial** · `Opportunities.integration.test.tsx` › carrega el catàleg i envia la cerca real al servei HTTP | **Completa** · `catalog.flow.ts` › US02.3.1 CA02 · Escribir no filtra; «Buscar» y Enter lanzan la mism… (+1) |
| CA03 | Sí | **Parcial** · `test_name_search.py` › test_ignores_case_accents_punctuation_and_extra_spaces (+1) | **Parcial** · `test_opportunity_search.py` › test_exact_match_ignores_case_and_accents | **Completa** · `catalog.flow.ts` › US02.3.1 CA03 · La búsqueda ignora espacios, mayúsculas y acentos, … |
| CA04 | Parcial | — | — | — |
| CA05 | Parcial | **Parcial** · `Opportunities.test.tsx` › al pulsar 'Buscar' con el campo vacío busca con cadena vacía (+1) | **Parcial** · `test_opportunity_search.py` › test_without_name_returns_the_whole_catalog | **Parcial** · `catalog.flow.ts` › US02.3.1 CA05 · Buscar con el campo vacío recupera el catálogo comp… |
| CA06 | Sí | **Parcial** · `Opportunities.test.tsx` › al pulsar 'Buscar' llama a fetchOpportunities con el término escrito | **Parcial** · `test_opportunity_search.py` › test_only_available_opportunities_are_searched (+2) | **Completa** · `catalog.flow.ts` › US02.3.1 CA06 · La búsqueda no devuelve oportunidades en borrador, … (+1) |
| CA07 | Sí | **Parcial** · `Opportunities.test.tsx` › muestra el número de oportunidades del listado (+2) | **Parcial** · `test_opportunity_search.py` › test_typos_are_found_ordered_by_distance (+2) | **Parcial** · `catalog.flow.ts` › US02.3.1 CA07 · El recuento coincide con las oportunidades mostrada… (+1) |
| CA08 | Parcial | **Parcial** · `Opportunities.test.tsx` › al limpiar el campo (Escape) se recarga el listado completo | — | — |
| CA09 | No | — | — | — |
| CA10 | Parcial | **Parcial** · `Opportunities.test.tsx` › muestra el skeleton cuando el estado es 'loading' | **Parcial** · `Opportunities.integration.test.tsx` › seleccionar «Empresarial» envia type=equity sense prémer «Buscar», … | — |
| CA11 | Sí | **Completa** · `Opportunities.test.tsx` › sin haber buscado, muestra el mensaje de 'no hay oportunidades publ… (+2) | **Parcial** · `Opportunities.integration.test.tsx` › carrega el catàleg i envia la cerca real al servei HTTP (+1) | **Parcial** · `catalog.flow.ts` › US02.3.1 CA11 · Sin coincidencias se muestra «0 oportunidades encon… |
| CA12 | Parcial | **Parcial** · `Opportunities.test.tsx` › muestra el mensaje de error y permite reintentar la petición (+1) | **Parcial** · `Opportunities.integration.test.tsx` › muestra el error del backend y permite reintentar sin recrear el store (+1) | — |
| CA13 | Sí | — | — | — |
| CA14 | Parcial | **Parcial** · `Opportunities.test.tsx` › el campo de búsqueda está asociado a su etiqueta (+2) | **Parcial** · `Opportunities.integration.test.tsx` › cercar amb un tipus seleccionat envia name i type junts, i canviar … | **Parcial** · `catalog.flow.ts` › US02.3.1 CA02 · Escribir no filtra; «Buscar» y Enter lanzan la mism… |
| CA15 | Parcial | **Parcial** · `test_name_search.py` › test_no_result_beyond_the_maximum_distance (+1) | **Parcial** · `test_opportunity_search.py` › test_name_longer_than_255_characters_is_rejected (+2) | **Parcial** · `catalog.flow.ts` › US02.3.1 CA06 · La búsqueda no devuelve oportunidades en borrador, … (+2) |
| CA16 | No | — | — | — |
| CA17 | No | — | — | — |
| CA18 | No | — | — | — |
| CA19 | No | — | — | — |
| CA20 | No | — | — | — |
| CA21 | No | — | — | — |

#### US02.3.2 Filtre per tipus

| Criteri | Implementat | Unitària | Integració | Funcional |
|---|---|---|---|---|
| c1 | Sí | **Completa** · `Opportunities.test.tsx` › muestra 'Tipo de activo' con 'Todos' seleccionado y carga todas las… (+2) | **Completa** · `Opportunities.integration.test.tsx` › seleccionar «Empresarial» envia type=equity sense prémer «Buscar», … (+1) | **Completa** · `catalog.flow.ts` › US02.3.1 CA01 y US02.3.2 c1 · Sin sesión hay buscador en castellano… |
| c2 | Sí | **Parcial** · `Opportunities.test.tsx` › al seleccionar un tipo filtra sin pulsar 'Buscar' y actualiza el re… (+2) | **Completa** · `Opportunities.integration.test.tsx` › seleccionar «Empresarial» envia type=equity sense prémer «Buscar», … (+2) | **Completa** · `catalog.flow.ts` › US02.3.2 c2 · Elegir «Empresarial» o «Inmobiliaria» filtra sin puls… |
| c3 | Sí | **Parcial** · `Opportunities.test.tsx` › al cambiar el tipo después de buscar 'girona' se conserva la búsqueda (+1) | **Completa** · `Opportunities.integration.test.tsx` › cercar amb un tipus seleccionat envia name i type junts, i canviar … (+1) | **Completa** · `catalog.flow.ts` › US02.3.2 c3 · Tras buscar «girona», elegir «Empresarial» deja solo … |
| c4 | Sí | **Parcial** · `Opportunities.test.tsx` › al buscar con un tipo seleccionado se conserva el tipo (+1) | **Completa** · `Opportunities.integration.test.tsx` › cercar amb un tipus seleccionat envia name i type junts, i canviar … (+2) | **Parcial** · `catalog.flow.ts` › US02.3.2 c4 · Con «Empresarial» seleccionado, buscar un nombre devu… |
| c5 | Sí | **Completa** · `Opportunities.test.tsx` › sin coincidencias para el tipo y la búsqueda, muestra 0 y el mensaj… (+1) | **Completa** · `Opportunities.integration.test.tsx` › cercar amb un tipus seleccionat envia name i type junts, i canviar … (+1) | **Completa** · `catalog.flow.ts` › US02.3.2 c5 · Sin resultados para el tipo y el nombre: «0 oportunid… |

#### US02.2.1 Detall immobiliari

| Criteri | Implementat | Unitària | Integració | Funcional |
|---|---|---|---|---|
| c1 | Sí | **Parcial** · `RealEstate.test.tsx` › muestra la tarjeta de financiación activa con importes, barra de pr… (+2) | **Parcial** · `RealEstateDetail.integration.test.tsx` › pide GET /api/opportunities/7 con la cookie, muestra el esqueleto y… (+2) | **Completa** · `real-estate-detail.flow.ts` › US02.2.1 c1 · Cabecera y financiación: enlace de vuelta, galería, t… (+2) |
| c2 | Parcial | **Parcial** · `RealEstate.test.tsx` › no redirige a /login mientras el estado de autenticación está en 'i… | **Parcial** · `test_opportunity_detail.py` › test_returns_the_full_detail_contract (+1) | **Parcial** · `real-estate-detail.flow.ts` › US02.2.1 · La ficha de una oportunidad publicada se puede consultar… |
| c3 | Sí | — | **Parcial** · `test_route_protection.py` › test_non_public_routes_reject_requests_without_session (+1) | — |
| c4 | Parcial | **Parcial** · `RealEstate.test.tsx` › clasifica las fechas del proyecto en pasadas y futuras y omite los … (+1) | **Parcial** · `RealEstateDetail.integration.test.tsx` › omite las fechas y los datos de la entidad que el backend envía com… (+1) | **Parcial** · `real-estate-detail.flow.ts` › US02.2.1 c4 · «Fechas del proyecto»: publicación pasada, fin de fin… (+1) |
| c5 | Sí | — | **Completa** · `test_opportunity_detail.py` › test_non_public_opportunities_get_the_same_not_found_response (+2) | — |
| c6 | Sí | **Completa** · `RealEstate.test.tsx` › indica 'Financiación completada' y deshabilita 'Quiero invertir' cu… (+1) | **Parcial** · `test_opportunities.py` › test_catalog_includes_only_available_opportunities (+1) | **Completa** · `real-estate-detail.flow.ts` › US02.2.1 c6 · Una oportunidad que ha alcanzado su objetivo muestra … (+1) |

#### US02.2.2 Detall empresarial

| Criteri | Implementat | Unitària | Integració | Funcional |
|---|---|---|---|---|
| c1 | Sí | **Completa** · `RealEstate.test.tsx` › navega a /opportunities/equity/:id sin aviso cuando el usuario aute… | **Parcial** · `Opportunities.integration.test.tsx` › un visitant que tria una oportunitat empresarial obre el seu detall… | **Parcial** · `business-detail.flow.ts` › US02.2.2 c1 · Desde el catálogo, una «Oportunidad Empresarial» abre… |
| c2 | Sí | **Completa** · `RealEstate.test.tsx` › abre el detalle empresarial sin el modal de inicio de sesión aunque… (+1) | **Completa** · `Opportunities.integration.test.tsx` › un visitant que tria una oportunitat empresarial obre el seu detall… (+2) | **Completa** · `business-detail.flow.ts` › US02.2.2 c2 · Sin sesión no aparece «Inicia sesión para ver los det… (+1) |
| c3 | Sí | **Parcial** · `BusinessDetail.test.tsx` › mostra la capçalera, la galeria, l'entitat promotora i el resum del… (+1) | **Parcial** · `BusinessDetail.integration.test.tsx` › un visitante abre el detalle sin sesión y ve los datos de la empres… (+1) | **Completa** · `business-detail.flow.ts` › US02.2.2 c3 · Cabecera y financiación: título, ubicación, galería, … (+1) |
| c4 | Sí | **Completa** · `BusinessDetail.test.tsx` › mostra el sector, la fase i les condicions de la inversió, sense ca… | **Parcial** · `BusinessDetail.integration.test.tsx` › un visitante abre el detalle sin sesión y ve los datos de la empres… (+1) | **Completa** · `business-detail.flow.ts` › US02.2.2 c4 · «Sector», «Fase de la empresa» y «Condiciones de la i… |
| c5 | Sí | **Completa** · `BusinessDetail.test.tsx` › mostra només la publicació i el final del finançament, sense ubicac… | **Completa** · `BusinessDetail.integration.test.tsx` › un visitante abre el detalle sin sesión y ve los datos de la empres… | **Completa** · `business-detail.flow.ts` › US02.2.2 c5 · «Fechas del proyecto» solo tiene «Publicación» y «Fin… |
| c6 | Sí | **Completa** · `BusinessDetail.test.tsx` › està actiu mentre l'oportunitat està en finançament (+2) | **Parcial** · `BusinessDetail.integration.test.tsx` › un visitante abre el detalle sin sesión y ve los datos de la empres… | **Parcial** · `business-detail.flow.ts` › US02.2.2 c6 · En financiación, «Quiero invertir» está activo (+2) |
| c7 | Sí | **Completa** · `BusinessDetail.test.tsx` › sense sessió, porta a l'inici de sessió en prémer-lo | **Completa** · `BusinessDetail.integration.test.tsx` › sin sesión, «Quiero invertir» lleva al inicio de sesión sin ninguna… | **Completa** · `business-detail.flow.ts` › US02.2.2 c7 · Sin sesión, «Quiero invertir» lleva al inicio de sesión |

#### US04.1 Consultar el saldo

| Criteri | Implementat | Unitària | Integració | Funcional |
|---|---|---|---|---|
| c1 | Sí | **Parcial** · `Header.test.tsx` › l’ofereix al client autenticat, fora del bloc ocult en mòbil, i nav… (+1) | **Parcial** · `PrivateRoutes.integration.test.tsx` › en recarregar /my-balance amb una cookie vàlida espera la sessió i … (+2) | **Parcial** · `balance.flow.ts` › 2. Navegar a 'Mi saldo' desde el Header (+1) |
| c2 | Sí | **Parcial** · `App.test.tsx` › porta el visitant al login sense mostrar la pàgina (+1) | **Completa** · `PrivateRoutes.integration.test.tsx` › un visitant a %s acaba al login sense demanar cap dada privada (+2) | **Parcial** · `session.flow.ts` › TR05 c2 · Sin token o con un token inválido, las rutas protegidas r… |
| c3 | Sí | **Completa** · `MyWalletPage.test.tsx` › mostra el títol i l’avís de simulació (+1) | **Completa** · `MyWallet.integration.test.tsx` › demana el saldo amb la cookie, no mostra cap import mentre carrega … | **Completa** · `balance.flow.ts` › 2. Navegar a 'Mi saldo' desde el Header (+1) |
| c4 | Sí | **Parcial** · `MyWalletPage.test.tsx` › amb saldo zero mostra l’import i el missatge específic (+1) | **Completa** · `test_wallet_balance.py` › test_user_without_wallet_gets_zero_without_creating_a_wallet (+2) | **Parcial** · `wallet-withdrawal.flow.ts` › US04.3 c2 · Con 0,00 € de saldo, «Retirar fondos» está desactivado … (+1) |
| c5 | Sí | **Completa** · `MyWalletPage.test.tsx` › formata %i cèntims com «%s» dins del resum «Saldo disponible» (+1) | **Completa** · `MyWallet.integration.test.tsx` › demana el saldo amb la cookie, no mostra cap import mentre carrega … (+1) | **Completa** · `my-investments.flow.ts` › US04.1 · «Mi saldo» muestra 1.234,56 € disponibles y 1.950,00 € com… |
| c6 | Sí | **Completa** · `MyWalletPage.test.tsx` › mostra «Cargando saldo…» sense cap import mentre consulta (+2) | **Completa** · `MyWallet.integration.test.tsx` › demana el saldo amb la cookie, no mostra cap import mentre carrega … (+2) | **Parcial** · `balance.flow.ts` › 2. Navegar a 'Mi saldo' desde el Header (+1) |
| c7 | Sí | **Completa** · `MyWalletPage.test.tsx` › davant un error mostra l’alerta i «Reintentar» torna a consultar (+2) | **Completa** · `MyWallet.integration.test.tsx` › amb %s avisa i «Reintentar» fa una sola consulta nova (+1) | — |
| c8 | Sí | **Parcial** · `test_auth_schemas_unit.py` › test_balance_requires_a_safe_non_negative_integer_amount (+2) | **Completa** · `test_wallet_balance.py` › test_repeated_reads_return_balance_without_mutating_wallet (+2) | — |
| c9 | Sí | **Parcial** · `MyWalletPage.test.tsx` › en canviar de client retira el saldo anterior i en consulta un de nou (+2) | **Completa** · `PrivateRoutes.integration.test.tsx` › en tancar sessió desapareix el saldo, i el compte següent només veu… (+2) | **Parcial** · `wallet-withdrawal.flow.ts` › US04.3 c2 · Con 0,00 € de saldo, «Retirar fondos» está desactivado … (+1) |
| c10 | Sí | — | **Completa** · `test_wallet_balance.py` › test_repeated_reads_return_balance_without_mutating_wallet | **Parcial** · `wallet-withdrawal.flow.ts` › US04.3 c7 · «Cancelar» y «Volver a mi saldo» regresan a «Mi saldo» … (+1) |
| c11 | Parcial | **Parcial** · `MyWalletPage.test.tsx` › enllaça a «Ingresar fondos» i a «Retirar fondos», i no ofereix inve… | — | — |
| c12 | Sí | **Parcial** · `MyWalletPage.test.tsx` › mostra «Cargando saldo…» sense cap import mentre consulta (+2) | **Parcial** · `MyWallet.integration.test.tsx` › demana el saldo amb la cookie, no mostra cap import mentre carrega … (+2) | — |

#### US04.2 Afegir fons

| Criteri | Implementat | Unitària | Integració | Funcional |
|---|---|---|---|---|
| c1 | Sí | **Completa** · `WalletDeposit.test.tsx` › «Ingresar fondos» de «Mi saldo» obre la pantalla amb el camp, el mí… | **Parcial** · `MyWallet.integration.test.tsx` › demana el saldo amb la cookie, no mostra cap import mentre carrega … (+1) | **Completa** · `wallet-deposit.flow.ts` › US04.2 c1 · En «Mi saldo», «Ingresar fondos» abre la pantalla con e… |
| c2 | Sí | **Completa** · `WalletDeposit.test.tsx` › amb «%s» no passa al pagament i mostra «%s» sota el camp (+2) | **Parcial** · `WalletDeposit.integration.test.tsx` › prepara el pagament amb un sol POST, passa el client_secret a Strip… (+1) | **Completa** · `wallet-deposit.flow.ts` › US04.2 c2 · «Continuar al pago» rechaza un importe inferior a 0,50 … |
| c3 | Sí | **Completa** · `WalletDeposit.test.tsx` › amb 100,00 € i la targeta 4242 torna a «Mi saldo» amb «Ingreso real… | **Completa** · `WalletDeposit.integration.test.tsx` › prepara el pagament amb un sol POST, passa el client_secret a Strip… (+2) | — |
| c4 | Sí | **Completa** · `WalletDeposit.test.tsx` › amb la targeta 4000 0000 0000 0002 es queda al pagament amb el moti… (+1) | **Completa** · `WalletDeposit.integration.test.tsx` › una targeta rebutjada no fa cap petició al backend i deixa tornar-h… | — |
| c5 | Sí | **Completa** · `WalletDeposit.test.tsx` › «Cancelar» al pas de l'import torna a «Mi saldo» sense crear cap pa… (+1) | **Parcial** · `WalletDeposit.integration.test.tsx` › «Volver» conserva l'import i «Continuar al pago» prepara un pagamen… | **Parcial** · `wallet-deposit.flow.ts` › US04.2 c5 · «Cancelar» en el paso del importe vuelve a «Mi saldo» s… |
| c6 | Sí | **Completa** · `App.test.tsx` › porta el visitant al login sense mostrar la pàgina | **Completa** · `PrivateRoutes.integration.test.tsx` › un visitant a %s acaba al login sense demanar cap dada privada | **Completa** · `wallet-deposit.flow.ts` › US04.2 c6 · Sin sesión, la pantalla de ingreso lleva al inicio de s… |

#### US04.3 Retirar fons

| Criteri | Implementat | Unitària | Integració | Funcional |
|---|---|---|---|---|
| c1 | Sí | **Completa** · `WalletWithdrawal.test.tsx` › «Retirar fondos» de «Mi saldo» obre la pantalla amb els tres camps,… | **Parcial** · `MyWallet.integration.test.tsx` › demana el saldo amb la cookie, no mostra cap import mentre carrega … (+1) | **Completa** · `wallet-withdrawal.flow.ts` › US04.3 c1 · Desde «Mi saldo», «Retirar fondos» abre la pantalla con… |
| c2 | Sí | **Completa** · `MyWalletPage.test.tsx` › amb saldo zero desactiva «Retirar fondos» i n'explica el motiu (+1) | **Completa** · `MyWallet.integration.test.tsx` › un compte nou veu 0,00 € i no pot retirar | **Completa** · `wallet-withdrawal.flow.ts` › US04.3 c2 · Con 0,00 € de saldo, «Retirar fondos» está desactivado … |
| c3 | Sí | **Completa** · `WalletWithdrawal.test.tsx` › «Retirar todo» omple l'import amb els 250,00 € disponibles | — | **Completa** · `wallet-withdrawal.flow.ts` › US04.3 c3 · «Retirar todo» rellena el importe con todo el saldo |
| c4 | Sí | **Completa** · `WalletWithdrawal.test.tsx` › amb %s no passa a la confirmació i mostra l'error sota el camp (+2) | **Parcial** · `WalletWithdrawal.integration.test.tsx` › si el saldo ha baixat (409) ho indica, torna a llegir el saldo i co… (+2) | **Completa** · `wallet-withdrawal.flow.ts` › US04.3 c4 · Un importe superior al saldo, un IBAN no válido y un ti… |
| c5 | Sí | **Completa** · `WalletWithdrawal.test.tsx` › mostra l'import, l'IBAN amb només els primers i els últims dígits, … (+1) | **Completa** · `WalletWithdrawal.integration.test.tsx` › retira 100,00 € amb un sol POST normalitzat i torna a «Mi saldo» am… (+1) | **Completa** · `wallet-withdrawal.flow.ts` › US04.3 c5 · La confirmación muestra importe, IBAN enmascarado, titu… |
| c6 | Sí | **Completa** · `WalletWithdrawal.test.tsx` › amb 250,00 € i una retirada de 100,00 € torna a «Mi saldo» amb «Ret… | **Completa** · `WalletWithdrawal.integration.test.tsx` › retira 100,00 € amb un sol POST normalitzat i torna a «Mi saldo» am… (+1) | **Completa** · `wallet-withdrawal.flow.ts` › US04.3 c6 · «Confirmar retirada» vuelve a «Mi saldo» con «Retirada … |
| c7 | Sí | **Completa** · `WalletWithdrawal.test.tsx` › «Cancelar» torna a «Mi saldo» sense retirar res (+1) | — | **Completa** · `wallet-withdrawal.flow.ts` › US04.3 c7 · «Cancelar» y «Volver a mi saldo» regresan a «Mi saldo» … |
| c8 | Sí | **Completa** · `App.test.tsx` › porta el visitant al login sense mostrar la pàgina | **Completa** · `PrivateRoutes.integration.test.tsx` › un visitant a %s acaba al login sense demanar cap dada privada (+1) | **Completa** · `wallet-withdrawal.flow.ts` › US04.3 c8 · Sin sesión, la pantalla de retirada lleva al inicio de … |

#### US03.1.1 Aportació immobiliària

| Criteri | Implementat | Unitària | Integració | Funcional |
|---|---|---|---|---|
| c1 | Sí | **Completa** · `CommitContribution.test.tsx` › «Quiero invertir» obre el diàleg amb el saldo, l'aportació mínima, … | **Completa** · `CommitContribution.integration.test.tsx` › compromete 100,00 € con un solo POST y actualiza el detalle y el sa… | **Completa** · `real-estate-commitment.flow.ts` › US03.1.1 c1 · «Quiero invertir» abre «Comprometer aportación» con s… |
| c2 | Sí | **Completa** · `CommitContribution.test.tsx` › un import %s no passa a la confirmació i mostra l'error sota el camp (+1) | **Parcial** · `CommitContribution.integration.test.tsx` › un 422 por debajo del mínimo vuelve al importe con el error bajo el… (+2) | **Completa** · `real-estate-commitment.flow.ts` › US03.1.1 c2 · Un importe inferior al mínimo, superior al pendiente … |
| c3 | Sí | **Completa** · `CommitContribution.test.tsx` › amb 250,00 € disponibles, 300,00 € no passa a la confirmació i ofer… (+1) | **Parcial** · `CommitContribution.integration.test.tsx` › $name bloquea el diálogo con su mensaje y al cerrarlo vuelve a leer… (+1) | **Completa** · `real-estate-commitment.flow.ts` › US03.1.1 c3 · Con 250,00 € un importe de 300,00 € avisa de saldo in… |
| c4 | Sí | **Completa** · `CommitContribution.test.tsx` › mostra l'import, l'oportunitat i el saldo que quedarà (+2) | **Parcial** · `CommitContribution.integration.test.tsx` › compromete 100,00 € con un solo POST y actualiza el detalle y el sa… (+1) | **Completa** · `real-estate-commitment.flow.ts` › US03.1.1 c4 · La confirmación muestra importe, oportunidad y saldo … |
| c5 | Sí | **Completa** · `CommitContribution.test.tsx` › compromet 100,00 €, actualitza el detall i «Mi saldo» mostra 150,00… | **Completa** · `CommitContribution.integration.test.tsx` › compromete 100,00 € con un solo POST y actualiza el detalle y el sa… (+1) | **Completa** · `real-estate-commitment.flow.ts` › US03.1.1 c5 · «Confirmar aportación» muestra «Aportación comprometi… (+1) |
| c6 | Sí | **Parcial** · `CommitContribution.test.tsx` › si l'aportació completa l'objectiu, el detall mostra «Financiación … (+2) | **Parcial** · `test_opportunity_commitments.py` › test_reaching_the_target_removes_the_opportunity_from_the_catalog (+1) | **Completa** · `funding-completion.flow.ts` › US03.1.1 c6 · El primero aporta los 500,00 € que faltaban: «Financi… (+1) |
| c7 | Sí | **Completa** · `CommitContribution.test.tsx` › mostra el missatge i no canvia ni el saldo ni el capital compromès (+2) | **Completa** · `CommitContribution.integration.test.tsx` › un 409 «ya no admite esta aportación» bloquea el diálogo sin cambia… (+2) | **Parcial** · `funding-completion.flow.ts` › US03.1.1 c7 · El segundo confirma después: «Esta oportunidad ya no … |
| c8 | Sí | **Completa** · `CommitContribution.test.tsx` › %s torna al detall sense canviar el saldo ni el capital compromès | — | **Parcial** · `real-estate-commitment.flow.ts` › US03.1.1 c8 · «Cancelar» cierra el diálogo sin cambiar el capital n… |
| c9 | Sí | **Completa** · `CommitContribution.test.tsx` › permet aportar exactament el pendent encara que sigui inferior al m… (+1) | **Completa** · `test_opportunity_commitments.py` › test_remaining_capital_below_the_minimum_only_accepts_the_exact_rem… | **Completa** · `funding-completion.flow.ts` › US03.1.1 c9 · Con un pendiente inferior a la aportación mínima se p… (+1) |

#### US03.1.2 Inversió empresarial

| Criteri | Implementat | Unitària | Integració | Funcional |
|---|---|---|---|---|
| c1 | Sí | **Completa** · `CommitInvestment.test.tsx` › «Quiero invertir» obre «Comprometer inversión» amb el saldo, l'apor… | **Parcial** · `CommitInvestment.integration.test.tsx` › envía el compromiso al endpoint real y actualiza el resultado visible | **Completa** · `business-investment.flow.ts` › US03.1.2 c1 · «Quiero invertir» abre «Comprometer inversión» con sa… |
| c2 | Sí | **Completa** · `CommitInvestment.test.tsx` › amb 1.000,00 € mostra 0,033 % i s'actualitza cada vegada que canvia… (+2) | **Parcial** · `test_opportunity_commitments.py` › test_trello_reference_scenario | **Completa** · `business-investment.flow.ts` › US03.1.2 c2 · 1.000,00 € equivalen a una «Participación estimada» d… |
| c3 | Sí | **Completa** · `CommitInvestment.test.tsx` › amb un import %s no passa a la confirmació i mostra l'error sota el… | **Parcial** · `test_opportunity_commitments.py` › test_amount_below_the_minimum_is_rejected (+2) | **Parcial** · `business-investment.flow.ts` › US03.1.2 c3 · Un importe inferior al mínimo o con tres decimales no… |
| c4 | Sí | **Completa** · `CommitInvestment.test.tsx` › amb 1.500,00 € disponibles, 2.000,00 € no passa a la confirmació i … (+1) | **Parcial** · `test_opportunity_commitments.py` › test_amount_above_the_available_balance_is_rejected | **Completa** · `business-investment.flow.ts` › US03.1.2 c4 · Con 1.500,00 € un importe de 2.000,00 € avisa de sald… |
| c5 | Sí | **Completa** · `CommitInvestment.test.tsx` › mostra la inversió, l'oportunitat, la valoració, la participació i … (+2) | — | **Completa** · `business-investment.flow.ts` › US03.1.2 c5 · La confirmación muestra importe, oportunidad, valorac… |
| c6 | Sí | **Completa** · `CommitInvestment.test.tsx` › confirma 1.000,00 €, ho anuncia amb la participació i actualitza el… (+1) | **Parcial** · `CommitInvestment.integration.test.tsx` › envía el compromiso al endpoint real y actualiza el resultado visible (+1) | **Parcial** · `business-investment.flow.ts` › US03.1.2 c6 · «Confirmar inversión» muestra «Inversión comprometida… (+1) |
| c7 | Sí | **Parcial** · `CommitInvestment.test.tsx` › en invertir els 500,00 € que falten, el detall mostra «Financiación… (+2) | **Parcial** · `test_opportunity_commitments.py` › test_reaching_the_target_removes_the_opportunity_from_the_catalog | **Completa** · `funding-completion.flow.ts` › US03.1.2 c7 · Al invertir los 500,00 € que faltaban: «Financiación … (+1) |
| c8 | Sí | **Completa** · `CommitInvestment.test.tsx` › si mentrestant %s, ho indica i no canvia ni el saldo ni el capital (+1) | **Parcial** · `test_opportunity_commitments.py` › test_opportunities_out_of_funding_no_longer_accept_contributions | — |
| c9 | Sí | **Completa** · `CommitInvestment.test.tsx` › %s torna al detall sense canviar el saldo ni el capital | — | **Parcial** · `business-investment.flow.ts` › US03.1.2 c9 · Cerrar el diálogo no cambia el capital ni el saldo |
| c10 | Sí | **Completa** · `CommitInvestment.test.tsx` › si només en queden 100,00 € (mínim de 250,00 €), permet invertir ex… (+1) | **Completa** · `test_opportunity_commitments.py` › test_remaining_capital_below_the_minimum_only_accepts_the_exact_rem… | **Completa** · `funding-completion.flow.ts` › US03.1.2 c10 · Con un pendiente inferior a la aportación mínima se … (+1) |

#### US05.1 Les meves inversions

| Criteri | Implementat | Unitària | Integració | Funcional |
|---|---|---|---|---|
| c1 | Sí | **Completa** · `Header.test.tsx` › l’ofereix a qualsevol usuari autenticat, al costat de «Mi saldo», i… (+2) | **Parcial** · `Login.integration.test.tsx` › un compte %s (+2) | **Completa** · `my-investments.flow.ts` › US05.1 c1 · «Ver mis inversiones» en «Mi saldo» abre «Mis inversiones» (+2) |
| c2 | Sí | **Parcial** · `MyInvestments.test.tsx` › mostra el total compromès, el nombre d'inversions i les que estan e… | **Completa** · `test_user_commitments.py` › test_summary_counts_commitments_and_those_in_funding (+1) | **Completa** · `my-investments.flow.ts` › US05.1 c2 · El resumen muestra «Total comprometido», «Inversiones» … (+1) |
| c3 | Sí | **Completa** · `MyInvestments.test.tsx` › mostra el tipus, la data, l'import, l'estat i el progrés actuals (+2) | **Completa** · `test_user_commitments.py` › test_each_commitment_carries_its_data_and_the_current_opportunity (+2) | **Completa** · `my-investments.flow.ts` › US05.1 c3 · La lista va de la más reciente a la más antigua y repit… (+1) |
| c4 | Sí | **Completa** · `MyInvestments.test.tsx` › una inversió d'1.000,00 € amb una valoració de 2.700.000 € i un obj… (+2) | **Completa** · `test_user_commitments.py` › test_business_investments_show_the_estimated_equity (+1) | **Completa** · `my-investments.flow.ts` › US05.1 c4 · «Participación estimada» (0,033 %) solo aparece en la i… |
| c5 | Sí | **Completa** · `MyInvestments.test.tsx` › una oportunitat que ha assolit l'objectiu mostra «Financiación comp… (+2) | **Parcial** · `test_user_commitments.py` › test_shows_the_current_status_not_the_one_at_commitment_time (+1) | **Completa** · `my-investments.flow.ts` › US05.1 c5 · El estado es el actual de cada oportunidad: «Financiaci… (+1) |
| c6 | Sí | **Completa** · `MyInvestments.test.tsx` › l'aportació inicial a una oportunitat pròpia pendent de revisió no … (+1) | **Parcial** · `test_user_commitments.py` › test_an_initial_contribution_pending_review_is_listed_without_publi… (+2) | **Completa** · `my-investments.flow.ts` › US05.1 c6 · La inversión en la oportunidad propia muestra «Pendient… |
| c7 | Sí | **Completa** · `MyInvestments.test.tsx` › el títol obre el detall de l'oportunitat (+1) | **Parcial** · `test_user_commitments.py` › test_shows_the_current_status_not_the_one_at_commitment_time (+1) | **Completa** · `my-investments.flow.ts` › US05.1 c7 · El título abre el detalle también de una oportunidad qu… |
| c8 | Sí | **Completa** · `MyInvestments.test.tsx` › mostra «Aún no has realizado ninguna inversión» i «Explorar oportun… | — | **Completa** · `my-investments.flow.ts` › US05.1 c8 · Sin inversiones se muestra «Aún no has realizado ningun… |
| c9 | Sí | **Completa** · `App.test.tsx` › porta el visitant al login sense mostrar la pàgina | **Completa** · `PrivateRoutes.integration.test.tsx` › un visitant a %s acaba al login sense demanar cap dada privada (+1) | **Completa** · `my-investments.flow.ts` › US05.1 c9 · Sin sesión, «Mis inversiones» lleva al inicio de sesión |

#### US05.2 Les meves oportunitats

| Criteri | Implementat | Unitària | Integració | Funcional |
|---|---|---|---|---|
| c1 | Sí | **Completa** · `Header.test.tsx` › no l’ofereix als visitants ni als comptes sense entitat promotora (+1) | **Parcial** · `Login.integration.test.tsx` › un compte %s (+2) | **Parcial** · `my-opportunities.flow.ts` › US05.2 c1 · La entidad promotora tiene el enlace «Mis oportunidades… (+1) |
| c2 | Sí | **Completa** · `App.test.tsx` › a un compte sense entitat promotora que obre %s li mostra l'avís am… (+1) | **Completa** · `PrivateRoutes.integration.test.tsx` › un compte sense entitat promotora veu l'avís a %s i no es demana ca… (+2) | **Completa** · `my-opportunities.flow.ts` › US05.2 c2 · Sin entidad promotora, la dirección muestra «Sección so… (+1) |
| c3 | Sí | **Parcial** · `MyOpportunities.test.tsx` › mostra el capital compromès, les publicades, les que estan en finan… | **Completa** · `test_promoter_opportunities.py` › test_summary_adds_up_the_published_opportunities (+1) | **Completa** · `my-opportunities.flow.ts` › US05.2 c3 · El resumen muestra «Capital comprometido», «Oportunidad… (+1) |
| c4 | Sí | **Completa** · `MyOpportunities.test.tsx` › mostra el tipus, la data de publicació, l'estat, el progrés, els in… (+1) | **Completa** · `test_promoter_opportunities.py` › test_each_opportunity_carries_the_data_shown_in_the_list (+2) | **Completa** · `my-opportunities.flow.ts` › US05.2 c4 · La lista va de la más reciente a la más antigua y no in… (+2) |
| c5 | Sí | **Completa** · `MyOpportunities.test.tsx` › «%s» continua a la llista amb l'indicador «%s» (+1) | **Parcial** · `test_promoter_opportunities.py` › test_funded_expired_and_closed_opportunities_stay_listed | **Completa** · `my-opportunities.flow.ts` › US05.2 c5 · Las oportunidades financiadas, vencidas y cerradas sigu… |
| c6 | Sí | **Completa** · `MyOpportunities.test.tsx` › el títol obre el detall immobiliari (+1) | **Parcial** · `test_promoter_opportunities.py` › test_funded_expired_and_closed_opportunities_stay_listed | **Completa** · `my-opportunities.flow.ts` › US05.2 c6 · El título abre el detalle de la oportunidad; la pendien… |
| c7 | Sí | **Completa** · `MyOpportunities.test.tsx` › mostra «Aún no has publicado ninguna oportunidad» sense resum ni ll… (+1) | **Completa** · `PrivateRoutes.integration.test.tsx` › un compte amb entitat promotora entra a «Mis oportunidades» i la pà… (+1) | **Completa** · `my-opportunities.flow.ts` › US05.2 c7 · Una entidad promotora sin oportunidades ve «Aún no has … |

#### US06.1.1 Crear oportunitat immobiliària

| Criteri | Implementat | Unitària | Integració | Funcional |
|---|---|---|---|---|
| c1 | Sí | **Completa** · `CreateOpportunity.test.tsx` › «Crear oportunidad» pregunta el tipus i «Inmobiliaria» obre el form… | **Parcial** · `CreateOpportunity.integration.test.tsx` › envía un único POST multipart con 'metadata' y las imágenes en orde… | **Completa** · `create-real-estate-opportunity.flow.ts` › US06.1.1 c1 · «Crear oportunidad» pregunta el tipo e «Inmobiliaria»… |
| c2 | Sí | **Completa** · `CreateOpportunity.test.tsx` › no continua si falten dades i mostra l'error sota cada camp (+2) | **Parcial** · `test_opportunities.py` › test_create_opportunity_rejects_invalid_data (+2) | **Parcial** · `create-real-estate-opportunity.flow.ts` › US06.1.1 c2 · «Información general» exige título, descripción, ubic… |
| c3 | Sí | **Completa** · `RealEstateStep.test.tsx` › «Viviendas previstas» amb el tipus %s: %s (+2) | **Parcial** · `test_opportunities.py` › test_create_opportunity_validates_real_estate_data (+2) | **Parcial** · `create-real-estate-opportunity.flow.ts` › US06.1.1 c3 · «Inmueble» pide finalidad, uso, tipo y superficie, y … |
| c4 | Sí | **Parcial** · `CreateOpportunity.test.tsx` › exigeix un objectiu positiu, un mínim que no el superi i una data l… (+2) | **Parcial** · `test_opportunities.py` › test_create_opportunity_rejects_invalid_data | **Parcial** · `create-real-estate-opportunity.flow.ts` › US06.1.1 c4 · «Financiación» exige un objetivo positivo, un mínimo … |
| c5 | Sí | **Completa** · `CreateOpportunity.test.tsx` › amb 8.000,00 € disponibles, una aportació inicial de 9.000,00 € no … (+2) | **Parcial** · `CreateOpportunity.integration.test.tsx` › tras $name se queda en «Revisión» con el borrador intacto y se pued… (+2) | **Parcial** · `create-real-estate-opportunity.flow.ts` › US06.1.1 c5 · Con 8.000,00 € una aportación inicial de 9.000,00 € a… |
| c6 | Sí | **Parcial** · `CreateOpportunity.test.tsx` › resumeix totes les dades i calcula el saldo que quedarà disponible (+2) | **Completa** · `CreateOpportunity.integration.test.tsx` › envía un único POST multipart con 'metadata' y las imágenes en orde… (+2) | **Completa** · `create-real-estate-opportunity.flow.ts` › US06.1.1 c6 · «Revisión» resume los datos con «Editar» y «Enviar a … (+2) |
| c7 | Sí | **Parcial** · `CreateOpportunity.test.tsx` › «Enviar a revisión» només s'activa amb la declaració de veracitat i… (+1) | **Completa** · `test_money_journey_integration.py` › test_opportunity_with_initial_contribution_is_reserved_listed_and_h… (+2) | **Completa** · `create-real-estate-opportunity.flow.ts` › US06.1.1 c7 · «Mi saldo» muestra 3.000,00 € disponibles y 5.000,00 … (+2) |
| c8 | Sí | **Completa** · `CreateOpportunity.test.tsx` › «Cancelar» demana confirmació i «Seguir editando» conserva les dades (+2) | — | **Completa** · `create-real-estate-opportunity.flow.ts` › US06.1.1 c8 · «Cancelar» y «Volver a mis oportunidades» piden confi… (+1) |

#### US06.1.2 Crear oportunitat empresarial

| Criteri | Implementat | Unitària | Integració | Funcional |
|---|---|---|---|---|
| c1 | Sí | **Completa** · `CreateOpportunity.test.tsx` › «Empresarial» obre «Nueva oportunidad empresarial» amb el pas «Empr… (+1) | **Parcial** · `CreateOpportunity.integration.test.tsx` › una oportunidad empresarial envía 'business' y no 'real_estate', si… (+1) | **Completa** · `create-business-opportunity.flow.ts` › US06.1.2 c1 · «Empresarial» abre «Nueva oportunidad empresarial» co… |
| c2 | Sí | **Completa** · `CreateOpportunity.test.tsx` › no continua si falten dades i mostra l'error sota cada camp (+2) | **Parcial** · `test_opportunities.py` › test_create_opportunity_rejects_invalid_data (+2) | **Parcial** · `create-business-opportunity.flow.ts` › US06.1.2 c2 · «Información general» es el mismo paso que en la opor… (+1) |
| c3 | Sí | **Completa** · `BusinessStep.test.tsx` › ofereix els sectors i les fases de la US (+2) | **Parcial** · `test_opportunities.py` › test_create_opportunity_validates_business_data (+1) | **Completa** · `create-business-opportunity.flow.ts` › US06.1.2 c3 · «Empresa» ofrece los sectores y las fases de la tarje… |
| c4 | Sí | **Parcial** · `CreateOpportunity.test.tsx` › exigeix un objectiu positiu, un mínim que no el superi i una data l… (+2) | **Parcial** · `test_opportunities.py` › test_create_opportunity_rejects_invalid_data | **Parcial** · `create-real-estate-opportunity.flow.ts` › US06.1.1 c4 · «Financiación» exige un objetivo positivo, un mínimo … |
| c5 | Sí | **Completa** · `CreateOpportunity.test.tsx` › amb una valoració d'1.350.000 €, un objectiu de 150.000 € mostra 10… (+2) | **Parcial** · `CreateOpportunity.integration.test.tsx` › una oportunidad empresarial envía 'business' y no 'real_estate', si… | **Completa** · `create-business-opportunity.flow.ts` › US06.1.2 c5 · Con una valoración de 1.350.000 € y un objetivo de 15… |
| c6 | Sí | **Completa** · `CreateOpportunity.test.tsx` › amb 8.000,00 € disponibles, una aportació inicial de 9.000,00 € no … (+2) | **Parcial** · `CreateOpportunity.integration.test.tsx` › una oportunidad empresarial envía 'business' y no 'real_estate', si… (+2) | **Parcial** · `create-business-opportunity.flow.ts` › US06.1.2 c6 · La aportación inicial es opcional y se valida contra … (+1) |
| c7 | Sí | **Parcial** · `CreateOpportunity.test.tsx` › resumeix l'empresa i la participació i envia l'oportunitat amb l'ap… (+2) | **Parcial** · `CreateOpportunity.integration.test.tsx` › una oportunidad empresarial envía 'business' y no 'real_estate', si… (+2) | **Completa** · `create-business-opportunity.flow.ts` › US06.1.2 c7 · «Revisión» resume la empresa y la participación, y al… (+2) |
| c8 | Sí | **Parcial** · `CreateOpportunity.test.tsx` › resumeix l'empresa i la participació i envia l'oportunitat amb l'ap… (+1) | **Completa** · `test_opportunities.py` › test_business_initial_contribution_reserves_funds_with_the_new_oppo… (+2) | **Completa** · `create-business-opportunity.flow.ts` › US06.1.2 c8 · La aportación inicial queda reservada: 5.000,00 € y 1… (+1) |
| c9 | Sí | **Completa** · `CreateOpportunity.test.tsx` › «Volver a mis oportunidades» també demana confirmació abans de sortir (+1) | — | **Parcial** · `create-real-estate-opportunity.flow.ts` › US06.1.1 c8 · «Cancelar» y «Volver a mis oportunidades» piden confi… (+1) |
