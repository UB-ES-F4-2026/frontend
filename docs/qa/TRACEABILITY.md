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
