import { expect, type Locator, type Page } from "@playwright/test";
import { mainNav } from "./accounts";
import { catalogCard, catalogResponse, detailResponse, searchCatalog } from "./pages";

// Data curta de les llistes («21 nov 2026»). El seed fa servir dates relatives a la seva
// execució: es comprova el format, mai un dia concret.
export const SHORT_DATE = /\d{1,2} \p{L}{3,5}\.? \d{4}/u;

// Valor (dd) d'una dada «etiqueta: valor». Es busca per l'etiqueta i no per la posició, perquè
// afegir una dada nova a la secció no trenqui les comprovacions de les altres.
export const factValue = (scope: Locator | Page, label: string) =>
  scope.locator(`dt:text-is("${label}") + dd`);

// Resum de «Mis oportunidades» i de «Mis inversiones».
export const summary = (page: Page) => page.getByLabel("Resumen", { exact: true });

export const region = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

// Targetes de «Mis oportunidades» i de «Mis inversiones», en l'ordre de la pàgina.
export const listCards = (page: Page, listName: "Oportunidades" | "Inversiones") =>
  region(page, listName).getByRole("article");

// Obre el detall des del catàleg sense recarregar la pàgina: amb una recàrrega, la targeta
// immobiliària es podria prémer abans de recuperar la sessió i mostraria el diàleg de login.
export async function openDetailWithinApp(page: Page, title: string) {
  await catalogResponse(page, () =>
    mainNav(page).getByRole("link", { name: "Oportunidades", exact: true }).click(),
  );
  await searchCatalog(page, title);
  const detail = await detailResponse(page, () => catalogCard(page, title).click());
  await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
  return detail;
}

// Targeta de finançament del detall: estat visible i botó «Quiero invertir» actiu o no.
export async function expectFundingState(
  page: Page,
  status: "En financiación" | "Financiación completada" | "Plazo finalizado",
  canInvest: boolean,
) {
  await expect(page.getByText(status, { exact: true })).toBeVisible();
  const button = page.getByRole("button", { name: "Quiero invertir" });
  if (canInvest) await expect(button).toBeEnabled();
  else await expect(button).toBeDisabled();
}
