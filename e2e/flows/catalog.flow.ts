import { test, expect, type Page } from "@playwright/test";
import { mainNav } from "../support/accounts";
import { catalogCard, catalogResponse, searchCatalog, type CatalogItem } from "../support/pages";
import { PORTFOLIO } from "../support/seed";

// Imports de la targeta del catàleg: euros sense decimals (`OpportunityCard.tsx`).
const cardEuros = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

// Oportunitats sembrades que no són al catàleg públic, amb el motiu.
const HIDDEN = [
  { title: PORTFOLIO.pendingReview, reason: "pendiente de revisión (borrador)" },
  { title: PORTFOLIO.rejected, reason: "rechazada" },
  { title: PORTFOLIO.funded, reason: "financiada" },
  { title: PORTFOLIO.expired, reason: "con el plazo vencido" },
  { title: PORTFOLIO.closed, reason: "cerrada" },
];

const cards = (page: Page) => page.getByRole("heading", { level: 3 });
// «N oportunidades encontradas»: el nombre ha de coincidir sempre amb les targetes mostrades.
const countLabel = (page: Page) => page.getByText(/^\d+ oportunidades? encontradas?$/);
const NO_MATCHES = "No se encontraron oportunidades que coincidan con los criterios de búsqueda.";

// Les targetes mostrades són exactament les de la resposta: mateix nombre, mateix ordre i sense duplicats.
async function expectCardsToMatch(page: Page, items: CatalogItem[]) {
  await expect(cards(page)).toHaveText(items.map((item) => item.title));
  await expect(countLabel(page)).toHaveText(new RegExp(`^${items.length} `));
  expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
}

async function chooseType(page: Page, option: "Todos" | "Inmobiliaria" | "Empresarial") {
  return catalogResponse(page, async () => {
    await page.getByRole("button", { name: /Tipo de activo/ }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  });
}

export const registerCatalogFlow = () => {
  test.describe("Flujo de Catálogo de Oportunidades (US02.1, US02.3.1 y US02.3.2)", () => {
    test(
      "un visitante consulta el catálogo: ve las oportunidades en financiación y ninguna que no esté disponible",
      { tag: "@smoke" },
      async ({ page }) => {
        let catalog: CatalogItem[] = [];

        await test.step("US02.1 c1 · El catálogo es accesible sin sesión desde la página de inicio", async () => {
          await page.goto("/");
          const { items } = await catalogResponse(page, () =>
            page.getByRole("link", { name: "Ver oportunidades" }).click(),
          );
          catalog = items;

          await expect(page).toHaveURL(/\/opportunities$/);
          await expect(page.getByRole("heading", { level: 1, name: "Oportunidades" })).toBeVisible();
          await expect(mainNav(page).getByRole("link", { name: "Registrarse" })).toBeVisible();
          await expect(mainNav(page).getByRole("button", { name: "Cerrar sesión" })).toHaveCount(0);
        });

        await test.step("US02.3.1 CA07 · El recuento coincide con las oportunidades mostradas, en orden y sin duplicados", async () => {
          expect(catalog.length).toBeGreaterThan(0);
          await expectCardsToMatch(page, catalog);
        });

        await test.step("US02.1 c2 · Cada oportunidad muestra su nombre, el tipo de activo, el capital comprometido y el objetivo", async () => {
          for (const [title, typeLabel] of [
            [PORTFOLIO.realEstateInFunding, "Oportunidad Inmobiliaria"],
            [PORTFOLIO.equityInFunding, "Oportunidad Empresarial"],
          ] as const) {
            const item = catalog.find((opportunity) => opportunity.title === title);
            expect(item, `«${title}» debe estar en el catálogo`).toBeDefined();

            const card = page.locator('[data-slot="card"]').filter({ has: catalogCard(page, title) });
            await expect(card).toHaveCount(1);
            await expect(card.getByText(typeLabel, { exact: true })).toBeVisible();
            await expect(card.getByText(item!.location, { exact: true })).toBeVisible();
            await expect(card.getByText(cardEuros.format(item!.committed_cents / 100), { exact: true })).toBeVisible();
            await expect(
              card.getByText(`de ${cardEuros.format(item!.target_amount_cents / 100)}`, { exact: true }),
            ).toBeVisible();
          }
        });

        await test.step("US02.1 c3 y c4 · No aparecen las oportunidades en borrador, rechazadas, financiadas, vencidas ni cerradas", async () => {
          const titles = catalog.map((item) => item.title);
          for (const { title, reason } of HIDDEN) {
            expect(titles, `«${title}» está ${reason} y no debe ofrecerse`).not.toContain(title);
            await expect(catalogCard(page, title)).toHaveCount(0);
          }
          // Totes les que es mostren admeten inversió: dins de termini i amb capital pendent.
          for (const item of catalog) {
            expect(new Date(item.deadline).getTime(), item.title).toBeGreaterThan(Date.now());
            expect(item.committed_cents, item.title).toBeLessThan(item.target_amount_cents);
          }
        });
      },
    );

    test("un visitante busca por nombre y filtra por tipo de activo", async ({ page }) => {
      let fullCatalog: CatalogItem[] = [];
      const searchField = () => page.getByLabel("Buscar por nombre");
      const typeFilter = () => page.getByRole("button", { name: /Tipo de activo/ });

      await test.step("US02.3.1 CA01 y US02.3.2 c1 · Sin sesión hay buscador en castellano y el filtro «Tipo de activo» empieza en «Todos» con los dos tipos", async () => {
        const { items } = await catalogResponse(page, () => page.goto("/opportunities"));
        fullCatalog = items;

        await expect(searchField()).toHaveAttribute("placeholder", "Buscar oportunidades...");
        await expect(page.getByRole("button", { name: "Buscar" })).toBeVisible();
        await expect(page.getByText("Busca por el nombre completo o por una parte")).toBeVisible();
        await expect(typeFilter()).toContainText("Todos");

        await expectCardsToMatch(page, fullCatalog);
        await expect(page.getByText("Oportunidad Inmobiliaria", { exact: true }).first()).toBeVisible();
        await expect(page.getByText("Oportunidad Empresarial", { exact: true }).first()).toBeVisible();
      });

      await test.step("US02.3.1 CA02 · Escribir no filtra; «Buscar» y Enter lanzan la misma consulta sobre el título", async () => {
        const requests: string[] = [];
        const record = (request: { url(): string; method(): string }) => {
          const url = new URL(request.url());
          if (url.pathname === "/api/opportunities" && request.method() === "GET") requests.push(url.search);
        };
        page.on("request", record);

        await searchField().fill("Zaragoza");
        await expectCardsToMatch(page, fullCatalog);
        expect(requests).toHaveLength(0);

        const byButton = await catalogResponse(page, () => page.getByRole("button", { name: "Buscar" }).click());
        expect(byButton.url.searchParams.get("name")).toBe("Zaragoza");
        expect(byButton.items.map((item) => item.title)).toEqual(["Nave Industrial Sostenible en Zaragoza"]);
        await expectCardsToMatch(page, byButton.items);

        const byEnter = await catalogResponse(page, () => searchField().press("Enter"));
        expect(byEnter.url.search).toBe(byButton.url.search);
        await expectCardsToMatch(page, byEnter.items);

        expect(requests).toHaveLength(2);
        page.off("request", record);
      });

      await test.step("US02.3.1 CA03 · La búsqueda ignora espacios, mayúsculas y acentos, y no mira la descripción", async () => {
        const normalized = await searchCatalog(page, "  REHABILITACION DE EDIFICIO  ");
        expect(normalized.items.map((item) => item.title)).toEqual([
          "Rehabilitación de Edificio Histórico en L'Eixample",
        ]);
        await expectCardsToMatch(page, normalized.items);

        // «fotovoltaicas» només surt a la descripció de la nau de Saragossa.
        const descriptionOnly = await searchCatalog(page, "fotovoltaicas");
        expect(descriptionOnly.items).toEqual([]);
      });

      await test.step("US02.3.1 CA11 · Sin coincidencias se muestra «0 oportunidades encontradas» y un mensaje distinto del de catálogo vacío", async () => {
        await expect(countLabel(page)).toHaveText(/^0 /);
        await expect(page.getByText(NO_MATCHES)).toBeVisible();
        await expect(page.getByText("¡Aún no hay oportunidades publicadas!")).toHaveCount(0);
        await expect(cards(page)).toHaveCount(0);
      });

      await test.step("US02.3.1 CA06 · La búsqueda no devuelve oportunidades en borrador, rechazadas, financiadas, vencidas ni cerradas", async () => {
        for (const { title, reason } of HIDDEN) {
          const { items } = await searchCatalog(page, title);
          expect(items.map((item) => item.title), `«${title}» está ${reason}`).not.toContain(title);
          await expectCardsToMatch(page, items);
          await expect(catalogCard(page, title)).toHaveCount(0);
        }
      });

      await test.step("US02.3.1 CA05 · Buscar con el campo vacío recupera el catálogo completo", async () => {
        const { url, items } = await searchCatalog(page, "");
        expect(url.searchParams.get("name") ?? "").toBe("");
        expect(items.length).toBeGreaterThan(1);
        await expectCardsToMatch(page, items);
        await expect(page.getByText(NO_MATCHES)).toHaveCount(0);
        await expect(catalogCard(page, PORTFOLIO.realEstateInFunding)).toBeVisible();
        await expect(catalogCard(page, PORTFOLIO.equityInFunding)).toBeVisible();
      });

      await test.step("US02.3.2 c2 · Elegir «Empresarial» o «Inmobiliaria» filtra sin pulsar «Buscar» y actualiza el recuento", async () => {
        const equity = await chooseType(page, "Empresarial");
        expect(equity.url.searchParams.get("type")).toBe("equity");
        expect(equity.items.length).toBeGreaterThan(0);
        expect(equity.items.every((item) => item.type === "equity")).toBe(true);
        await expectCardsToMatch(page, equity.items);
        await expect(page.getByText("Oportunidad Empresarial", { exact: true })).toHaveCount(equity.items.length);
        await expect(page.getByText("Oportunidad Inmobiliaria", { exact: true })).toHaveCount(0);
        await expect(catalogCard(page, PORTFOLIO.equityInFunding)).toBeVisible();

        const realEstate = await chooseType(page, "Inmobiliaria");
        expect(realEstate.url.searchParams.get("type")).toBe("real_estate");
        expect(realEstate.items.every((item) => item.type === "real_estate")).toBe(true);
        await expectCardsToMatch(page, realEstate.items);
        await expect(page.getByText("Oportunidad Empresarial", { exact: true })).toHaveCount(0);
        await expect(catalogCard(page, PORTFOLIO.realEstateInFunding)).toBeVisible();
      });

      await test.step("US02.3.2 c3 · Tras buscar «girona», elegir «Empresarial» deja solo «Cervecera artesana en Girona»", async () => {
        await chooseType(page, "Todos");
        const all = await searchCatalog(page, "girona");
        const titles = all.items.map((item) => item.title);
        expect(titles).toContain(PORTFOLIO.realEstateInFunding);
        expect(titles).toContain(PORTFOLIO.equityInFunding);
        expect(titles.every((title) => /girona/i.test(title))).toBe(true);
        await expectCardsToMatch(page, all.items);

        const equity = await chooseType(page, "Empresarial");
        expect(equity.url.searchParams.get("name")).toBe("girona");
        expect(equity.items.map((item) => item.title)).toEqual([PORTFOLIO.equityInFunding]);
        await expectCardsToMatch(page, equity.items);
        await expect(searchField()).toHaveValue("girona");
      });

      await test.step("US02.3.2 c4 · Con «Empresarial» seleccionado, buscar un nombre devuelve solo las empresariales que coinciden", async () => {
        const { url, items } = await searchCatalog(page, "EcoLogistics");
        expect(url.searchParams.get("type")).toBe("equity");
        expect(items.map((item) => item.title)).toEqual(["Ronda Seed - EcoLogistics SL"]);
        await expectCardsToMatch(page, items);
      });

      await test.step("US02.3.2 c5 · Sin resultados para el tipo y el nombre: «0 oportunidades encontradas» y el mensaje de sin coincidencias", async () => {
        const { url, items } = await chooseType(page, "Inmobiliaria");
        expect(url.searchParams.get("name")).toBe("EcoLogistics");
        expect(items).toEqual([]);

        await expect(countLabel(page)).toHaveText("0 oportunidades encontradas");
        await expect(page.getByText(NO_MATCHES)).toBeVisible();
        await expect(cards(page)).toHaveCount(0);
      });
    });
  });
};
