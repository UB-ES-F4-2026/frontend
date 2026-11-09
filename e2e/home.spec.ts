import { test } from "@playwright/test";
import { registerAuthFlow } from "./flows/auth.flow";

test.describe("Suite E2E Principal - Flujos de Usuario", () => {
  // Cada función registra su propio bloque test.describe y sus steps
  registerAuthFlow();
});