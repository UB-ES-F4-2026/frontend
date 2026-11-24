import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { creditWallet } from "./wallet";

export const E2E_PASSWORD = "Password123!";

export interface E2EAccount {
  id: number;
  email: string;
  password: string;
}

interface PromotingEntityData {
  legal_name: string;
  founding_year?: number;
  location?: string;
}

interface NewAccountOptions {
  firstName?: string;
  lastName?: string;
  // Saldo disponible inicial, ingressat pel webhook signat.
  balanceCents?: number;
  // Registra el compte com a entitat promotora.
  promotingEntity?: PromotingEntityData;
}

// Correu únic per intent: un reintent o un altre worker no pot topar amb un compte anterior.
export const uniqueEmail = (prefix: string) =>
  `${prefix}.e2e.${Date.now()}.${randomUUID().slice(0, 8)}@example.com`;

// Sufix únic per als noms que el flux crea (raons socials, títols).
export const uniqueSuffix = () => `${Date.now().toString(36)}${randomUUID().slice(0, 4)}`;

// Crea per l'API el compte propi del flux (i, si cal, el seu saldo). El registre és públic:
// no depèn de cap sessió ni de cap dada del seed.
export async function createAccount(
  page: Page,
  prefix: string,
  { firstName = "Marta", lastName = "Prueba E2E", balanceCents = 0, promotingEntity }: NewAccountOptions = {},
): Promise<E2EAccount> {
  const email = uniqueEmail(prefix);
  const response = await page.request.post("/api/auth/register", {
    data: {
      first_name: firstName,
      last_name: lastName,
      email,
      phone: "+34612345678",
      password: E2E_PASSWORD,
      ...(promotingEntity ? { promoting_entity: promotingEntity } : {}),
    },
  });
  expect(response.status(), await response.text()).toBe(201);
  const { id } = (await response.json()) as { id: number };

  if (balanceCents > 0) await creditWallet(page.request, id, balanceCents);
  return { id, email, password: E2E_PASSWORD };
}

// La sessió sempre s'obre per la interfície, com ho fa l'usuari.
export async function loginThroughUi(page: Page, account: Pick<E2EAccount, "email" | "password">) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(account.email);
  await page.getByLabel("Contraseña").fill(account.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(mainNav(page).getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
}

export async function logoutThroughUi(page: Page) {
  await mainNav(page).getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

export const mainNav = (page: Page) => page.getByRole("navigation", { name: "Navegación principal" });
