import { expect, type Locator, type Page } from "@playwright/test";
import { mainNav } from "./accounts";
import { eur } from "./money";

// Camps del detall d'una oportunitat que fan servir els fluxos.
export interface OpportunityDetail {
  id: number;
  type: "real_estate" | "equity";
  title: string;
  target_amount_cents: number;
  committed_cents: number;
  minimum_contribution_cents: number | null;
  deadline: string;
}

export interface CatalogItem {
  id: number;
  type: "real_estate" | "equity";
  title: string;
  location: string;
  target_amount_cents: number;
  committed_cents: number;
  deadline: string;
}

const isCatalogRequest = (url: string) => new URL(url).pathname === "/api/opportunities";
const isDetailRequest = (url: string) => /^\/api\/opportunities\/\d+$/.test(new URL(url).pathname);

// Títol d'una targeta del catàleg (les targetes no tenen rol propi: el títol és un h3).
export const catalogCard = (page: Page, title: string) =>
  page.getByRole("heading", { level: 3, name: title, exact: true });

// Llança una acció que recarrega el catàleg i espera la seva resposta: el catàleg no descarta
// respostes antigues, així que cada pas ha d'esperar la seva abans de continuar.
export async function catalogResponse(page: Page, action: () => Promise<unknown>) {
  const responsePromise = page.waitForResponse(
    (response) => isCatalogRequest(response.url()) && response.request().method() === "GET",
  );
  await action();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  return { url: new URL(response.url()), items: (await response.json()) as CatalogItem[] };
}

export async function searchCatalog(page: Page, term: string) {
  const field = page.getByLabel("Buscar por nombre");
  await field.fill(term);
  return catalogResponse(page, () => page.getByRole("button", { name: "Buscar" }).click());
}

// Obre el detall com ho fa l'usuari: cerca el títol al catàleg i prem la targeta.
// Retorna el detall que ha servit l'API, per poder fer comprovacions relatives al seu capital.
export async function openOpportunityFromCatalog(page: Page, title: string): Promise<OpportunityDetail> {
  // Amb l'app ja oberta es navega per la capçalera: una recàrrega tornaria a comprovar la sessió
  // i, mentre no acaba, la targeta immobiliària demanaria iniciar sessió.
  const insideApp = page.url().startsWith("http");
  await catalogResponse(page, () =>
    insideApp
      ? mainNav(page).getByRole("link", { name: "Oportunidades", exact: true }).click()
      : page.goto("/opportunities"),
  );
  await searchCatalog(page, title);
  return detailResponse(page, () => catalogCard(page, title).click());
}

export async function detailResponse(page: Page, action: () => Promise<unknown>): Promise<OpportunityDetail> {
  const responsePromise = page.waitForResponse(
    (response) => isDetailRequest(response.url()) && response.request().method() === "GET",
  );
  await action();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  return (await response.json()) as OpportunityDetail;
}

// «Mi saldo»: l'import disponible és l'únic paràgraf amb aquest text exacte; el comprometido
// i el total van en una llista de definicions.
export async function expectWalletBalance(page: Page, availableCents: number, committedCents: number) {
  const region = page.getByRole("region", { name: "Saldo disponible" });
  await expect(region.getByText(eur(availableCents), { exact: true }).and(region.locator("p"))).toBeVisible();
  await expect(region.getByRole("term")).toHaveText(["Saldo comprometido", "Total"]);
  await expect(region.getByRole("definition")).toHaveText([
    eur(committedCents),
    eur(availableCents + committedCents),
  ]);
}

export async function openMyBalance(page: Page) {
  await mainNav(page).getByRole("link", { name: "Mi saldo" }).click();
  await expect(page).toHaveURL(/\/my-balance$/);
  await expect(page.getByRole("heading", { level: 1, name: "Mi saldo" })).toBeVisible();
}

// Les caselles de HeroUI amaguen l'input real: cal forçar el clic, com als fluxos existents.
export const checkBox = (checkbox: Locator) => checkbox.check({ force: true });
