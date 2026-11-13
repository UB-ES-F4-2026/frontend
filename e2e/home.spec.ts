import { test } from "@playwright/test";
import { registerAuthFlow } from "./flows/auth.flow";
import { registerRealEstateInvestmentFlow } from "./flows/real-estate-investment.flow";
import { registerBalanceFlow } from "./flows/balance.flow";

test.describe("Suite E2E Principal - Flujos de Usuario", () => {
  registerAuthFlow();
  registerRealEstateInvestmentFlow();
  registerBalanceFlow();
});