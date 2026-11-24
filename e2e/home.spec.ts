import { test } from "@playwright/test";
import { registerAuthFlow } from "./flows/auth.flow";
import { registerRealEstateInvestmentFlow } from "./flows/real-estate-investment.flow";
import { registerBalanceFlow } from "./flows/balance.flow";
import { registerRealEstateCommitmentFlow } from "./flows/real-estate-commitment.flow";
import { registerBusinessInvestmentFlow } from "./flows/business-investment.flow";
import { registerFundingCompletionFlow } from "./flows/funding-completion.flow";
import { registerWalletWithdrawalFlow } from "./flows/wallet-withdrawal.flow";
import { registerWalletDepositFlow } from "./flows/wallet-deposit.flow";
import { registerSessionFlow } from "./flows/session.flow";
import { registerCatalogFlow } from "./flows/catalog.flow";
import { registerBusinessDetailFlow } from "./flows/business-detail.flow";
import { registerRealEstateDetailFlow } from "./flows/real-estate-detail.flow";
import { registerPromoterRegistrationFlow } from "./flows/promoter-registration.flow";
import { registerCreateRealEstateOpportunityFlow } from "./flows/create-real-estate-opportunity.flow";
import { registerCreateBusinessOpportunityFlow } from "./flows/create-business-opportunity.flow";
import { registerMyOpportunitiesFlow } from "./flows/my-opportunities.flow";
import { registerMyInvestmentsFlow } from "./flows/my-investments.flow";

// Cada flux és independent: registra els seus usuaris, ingressa el saldo que necessita i només
// escriu a la seva oportunitat sembrada. L'ordre d'aquesta llista no importa, i cada flux es
// pot executar sol (`npx playwright test -g "<títol>"`). Els camins principals porten
// l'etiqueta @smoke (`npx playwright test --grep @smoke`); la resta són de regressió.
test.describe("Suite E2E Principal - Flujos de Usuario", () => {
  // Autenticació i sessió
  registerAuthFlow();
  registerSessionFlow();
  registerPromoterRegistrationFlow();

  // Catàleg i detall
  registerCatalogFlow();
  registerRealEstateInvestmentFlow();
  registerBusinessDetailFlow();
  registerRealEstateDetailFlow();

  // Saldo
  registerBalanceFlow();
  registerWalletDepositFlow();
  registerWalletWithdrawalFlow();

  // Compromisos
  registerRealEstateCommitmentFlow();
  registerBusinessInvestmentFlow();
  registerFundingCompletionFlow();

  // Entitat promotora i cartera
  registerCreateRealEstateOpportunityFlow();
  registerCreateBusinessOpportunityFlow();
  registerMyOpportunitiesFlow();
  registerMyInvestmentsFlow();
});
