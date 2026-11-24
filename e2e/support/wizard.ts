import { expect, type Page } from "@playwright/test";
import { mainNav } from "./accounts";

// PNG vàlid d'1x1 píxel: el backend comprova la capçalera del fitxer, no només l'extensió,
// i la miniatura del formulari l'ha de poder descodificar.
export const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

const shortDate = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

// Data límit relativa a l'execució (30 de juny de l'any vinent, a migdia de Madrid): una data
// fixa acabaria caducant. `label` és com la mostren les targetes («30 jun 2027»).
export const futureDeadline = () => {
  const year = new Date().getFullYear() + 1;
  return {
    input: `${year}-06-30T12:00`,
    label: shortDate.format(new Date(Date.UTC(year, 5, 30, 10, 0))),
  };
};

// Títol del pas actual de l'assistent (els títols de la revisió són de nivell 3).
export const stepHeading = (page: Page, name: string) => page.getByRole("heading", { level: 2, name, exact: true });

export const continueStep = (page: Page) => page.getByRole("button", { name: "Continuar", exact: true }).click();

// Els desplegables de HeroUI són un botó que obre una llista d'opcions.
export async function chooseOption(page: Page, field: RegExp, option: string) {
  await page.getByRole("button", { name: field }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
  await expect(page.getByRole("button", { name: field })).toContainText(option);
}

// Entra a «Mis oportunidades» des de la capçalera, com ho fa l'entitat promotora.
export async function openMyOpportunities(page: Page) {
  await mainNav(page).getByRole("link", { name: "Mis oportunidades" }).click();
  await expect(page).toHaveURL(/\/my-opportunities$/);
  await expect(page.getByRole("heading", { level: 1, name: "Mis oportunidades" })).toBeVisible();
}

// «Crear oportunidad» → diàleg de tipus → formulari del tipus triat.
export async function openCreationForm(page: Page, type: "Inmobiliaria" | "Empresarial") {
  await page.getByRole("button", { name: "Crear oportunidad" }).click();
  const dialog = page.getByRole("dialog", { name: "¿Qué tipo de oportunidad quieres crear?" });
  await expect(dialog).toBeVisible();
  // L'enllaç inclou la descripció del tipus al nom accessible: no pot ser una coincidència exacta.
  await dialog.getByRole("link", { name: new RegExp(`^${type}`) }).click();
}

interface GeneralInfo {
  title: string;
  description: string;
  municipality: string;
  province: string;
  country: string;
}

// Pas «Información general» complet, amb una imatge creada en memòria.
export async function fillGeneralInfo(page: Page, info: GeneralInfo) {
  await page.getByLabel("Título").fill(info.title);
  await page.getByLabel("Descripción").fill(info.description);
  await page.getByLabel("Municipio").fill(info.municipality);
  await page.getByLabel("Provincia").fill(info.province);
  await page.getByLabel("País").fill(info.country);
  await page.getByLabel("Añadir imágenes").setInputFiles({
    name: "portada.png",
    mimeType: "image/png",
    buffer: PNG_1X1,
  });
  await expect(page.getByRole("img", { name: "portada.png" })).toBeVisible();
}

// Marca la declaració, envia l'oportunitat i comprova que el servidor l'ha creada.
export async function submitForReview(page: Page) {
  const submit = page.getByRole("button", { name: "Enviar a revisión" });
  await expect(submit).toBeDisabled();
  await page
    .getByRole("checkbox", { name: /Declaro que la información es veraz/ })
    .check({ force: true });
  await expect(submit).toBeEnabled();

  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/opportunities" && response.request().method() === "POST",
  );
  await submit.click();
  expect((await responsePromise).status()).toBe(201);
  await expect(page).toHaveURL(/\/my-opportunities$/);
}

// Avís que es mostra una sola vegada en tornar a «Mis oportunidades» (el de càrrega també és un `status`).
export const sentToReviewNotice = (page: Page) =>
  page.getByRole("status").filter({ hasText: "Oportunidad enviada a revisión" });
