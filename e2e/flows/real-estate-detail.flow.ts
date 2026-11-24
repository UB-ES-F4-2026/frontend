import { test, expect } from "@playwright/test";
import { loginThroughUi, mainNav } from "../support/accounts";
import { detailEur, fundedPercent } from "../support/money";
import { type CatalogItem } from "../support/pages";
import { expectFundingState, factValue, openDetailWithinApp, region } from "../support/portfolio";
import { PORTFOLIO, SEEDED_INVESTOR, SEEDED_PROMOTER } from "../support/seed";

export const registerRealEstateDetailFlow = () => {
  test.describe("Flujo de Detalle de Oportunidad Inmobiliaria (US02.2.1)", () => {
    test("revisa la ficha de un inmueble en financiación y los estados de una oportunidad financiada y de otra con el plazo vencido", async ({
      page,
    }) => {
      test.setTimeout(60_000);
      // Oportunitats de la cartera de només lectura: cap flux hi compromet saldo.
      const title = PORTFOLIO.realEstateInFunding;
      const COMMITTED = 3_000_000;
      const TARGET = 12_000_000;

      // Les finançades i les vençudes ja no són al catàleg: s'hi arriba des de «Mis inversiones».
      const openFromMyInvestments = async (opportunityTitle: string) => {
        await mainNav(page).getByRole("link", { name: "Mis inversiones" }).click();
        await page
          .getByRole("article", { name: opportunityTitle, exact: true })
          .getByRole("link", { name: opportunityTitle })
          .click();
        await expect(page).toHaveURL(/\/opportunities\/real-estate\/\d+$/);
        await expect(page.getByRole("heading", { level: 1, name: opportunityTitle })).toBeVisible();
      };

      await test.step("US02.2.1 · La ficha de una oportunidad publicada se puede consultar sin sesión por su enlace", async () => {
        const response = await page.request.get("/api/opportunities", { params: { name: title } });
        expect(response.status()).toBe(200);
        const opportunity = ((await response.json()) as CatalogItem[]).find((item) => item.title === title);
        expect(opportunity, `El seed debe publicar «${title}»`).toBeDefined();

        await page.goto(`/opportunities/real-estate/${opportunity!.id}`);
        await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`/opportunities/real-estate/${opportunity!.id}$`));
        await expect(mainNav(page).getByRole("button", { name: "Cerrar sesión" })).toHaveCount(0);
      });

      await test.step("1. Iniciar sesión como inversora y abrir el inmueble desde el catálogo", async () => {
        await loginThroughUi(page, SEEDED_INVESTOR);
        const detail = await openDetailWithinApp(page, title);
        await expect(page).toHaveURL(new RegExp(`/opportunities/real-estate/${detail.id}$`));
      });

      await test.step("US02.2.1 c1 · Cabecera y financiación: enlace de vuelta, galería, título, ubicación, estado, capital, objetivo, progreso, fecha límite, aportación mínima, «Quiero invertir» y aviso de riesgo", async () => {
        const overview = region(page, title);
        await expect(page.getByRole("link", { name: "Volver a oportunidades" })).toBeVisible();
        await expect(overview.getByRole("figure")).toBeVisible();
        await expect(overview.getByText("Girona, Girona, España", { exact: true })).toBeVisible();

        await expectFundingState(page, "En financiación", true);
        await expect(overview.getByText("Capital comprometido", { exact: true })).toBeVisible();
        await expect(overview.getByText(detailEur(COMMITTED), { exact: true })).toBeVisible();
        await expect(overview.getByText("Objetivo de financiación", { exact: true })).toBeVisible();
        await expect(overview.getByText(detailEur(TARGET), { exact: true })).toBeVisible();
        await expect(
          overview.getByRole("progressbar", { name: "Capital comprometido respecto al objetivo" }),
        ).toBeVisible();
        await expect(
          overview.getByText(`${fundedPercent(COMMITTED, TARGET)} del objetivo`, { exact: true }),
        ).toBeVisible();
        await expect(factValue(overview, "Fecha límite de financiación")).toContainText("Hora de Madrid");
        await expect(factValue(overview, "Aportación mínima")).toHaveText(detailEur(10_000));
        await expect(
          overview.getByText("El capital comprometido no equivale a dinero cobrado ni a participaciones adquiridas."),
        ).toBeVisible();
      });

      await test.step("US02.2.1 c1 · «Entidad promotora» con nombre, «Proyectos publicados», «Años de experiencia» y «Ubicación»", async () => {
        const promoter = region(page, "Entidad promotora");
        await expect(promoter.getByText(SEEDED_PROMOTER.legalName, { exact: true })).toBeVisible();
        await expect(factValue(promoter, "Proyectos publicados")).toHaveText("6");
        await expect(factValue(promoter, "Años de experiencia")).toContainText("7");
        await expect(factValue(promoter, "Ubicación")).toHaveText("Girona, España");
      });

      await test.step("US02.2.1 c1 · «Resumen del proyecto» («Finalidad», «Uso previsto») y «Características del inmueble» (superficie y «Viviendas previstas» de un residencial)", async () => {
        const projectSummary = region(page, "Resumen del proyecto");
        await expect(factValue(projectSummary, "Finalidad")).toHaveText("Adquisición");
        await expect(factValue(projectSummary, "Uso previsto")).toHaveText("Alquiler");

        const features = region(page, "Características del inmueble");
        await expect(factValue(features, "Superficie")).toHaveText("85,5 m²");
        await expect(factValue(features, "Viviendas previstas")).toHaveText("1");
      });

      await test.step("US02.2.1 c4 · «Fechas del proyecto»: publicación pasada, fin de financiación futuro y solo las fechas opcionales de este proyecto (alquiler, sin obras)", async () => {
        await expect(region(page, "Fechas del proyecto").getByRole("listitem")).toHaveText([
          /^Publicación.*Fecha pasada$/,
          /^Fin de financiación.*Fecha futura$/,
          /^Inicio estimado del alquiler.*Fecha futura$/,
        ]);
      });

      await test.step("US02.2.1 c1 · «Ubicación aproximada» muestra el mapa centrado en las coordenadas públicas", async () => {
        const location = region(page, "Ubicación aproximada");
        await expect(location.getByText("Girona, Girona, España", { exact: true })).toBeVisible();

        const map = location.locator('iframe[title="Mapa de la ubicación aproximada"]');
        await expect(map).toHaveAttribute("src", /^https:\/\/www\.openstreetmap\.org\/export\/embed\.html\?/);
        await expect(map).toHaveAttribute("src", /marker=41\.983,2\.824$/);
      });

      await test.step("US02.2.1 c4 · Un terreno en venta muestra su finalidad, su uso y la fecha de obras, sin fecha de alquiler", async () => {
        await openDetailWithinApp(page, PORTFOLIO.landWithoutMap);

        const projectSummary = region(page, "Resumen del proyecto");
        await expect(factValue(projectSummary, "Finalidad")).toHaveText("Construcción");
        await expect(factValue(projectSummary, "Uso previsto")).toHaveText("Venta");
        await expect(region(page, "Fechas del proyecto").getByRole("listitem")).toHaveText([
          /^Publicación.*Fecha pasada$/,
          /^Fin de financiación.*Fecha futura$/,
          /^Finalización estimada de las obras.*Fecha futura$/,
        ]);
      });

      await test.step("US02.2.1 c6 · Una oportunidad que ha alcanzado su objetivo muestra «Financiación completada» y no se puede invertir", async () => {
        await openFromMyInvestments(PORTFOLIO.funded);

        await expectFundingState(page, "Financiación completada", false);
        await expect(page.getByText(`${fundedPercent(1, 1)} del objetivo`, { exact: true })).toBeVisible();
      });

      await test.step("US02.2.1 c6 · Una oportunidad con el plazo vencido muestra «Plazo finalizado» y no se puede invertir", async () => {
        await openFromMyInvestments(PORTFOLIO.expired);

        await expectFundingState(page, "Plazo finalizado", false);
        await expect(region(page, "Fechas del proyecto").getByRole("listitem").nth(1)).toHaveText(
          /^Fin de financiación.*Fecha pasada$/,
        );
      });
    });
  });
};
