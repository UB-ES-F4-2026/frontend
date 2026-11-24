import { test, expect } from "@playwright/test";
import { mainNav } from "../support/accounts";
import { detailEur, fundedPercent } from "../support/money";
import { openOpportunityFromCatalog } from "../support/pages";
import { expectFundingState, factValue, region } from "../support/portfolio";
import { PORTFOLIO, SEEDED_PROMOTER } from "../support/seed";

export const registerBusinessDetailFlow = () => {
  test.describe("Flujo de Detalle de Oportunidad Empresarial (US02.2.2)", () => {
    test(
      "un visitante abre una oportunidad empresarial desde el catálogo, revisa sus datos y al invertir llega al inicio de sesión",
      { tag: "@smoke" },
      async ({ page }) => {
        // Oportunitat de la cartera de només lectura: cap flux hi compromet saldo.
        const title = PORTFOLIO.equityInFunding;
        const COMMITTED = 18_450_000;
        const TARGET = 30_000_000;
        let detailUrl = "";

        await test.step("US02.2.2 c1 · Desde el catálogo, una «Oportunidad Empresarial» abre su detalle", async () => {
          const detail = await openOpportunityFromCatalog(page, title);
          detailUrl = page.url();

          await expect(page).toHaveURL(new RegExp(`/opportunities/equity/${detail.id}$`));
          await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
          await expect(
            page.getByText("Actualmente solo se pueden ver detalles de oportunidades inmobiliarias."),
          ).toHaveCount(0);
        });

        await test.step("US02.2.2 c2 · Sin sesión no aparece «Inicia sesión para ver los detalles»", async () => {
          await expect(mainNav(page).getByRole("link", { name: "Registrarse" })).toBeVisible();
          await expect(mainNav(page).getByRole("button", { name: "Cerrar sesión" })).toHaveCount(0);
          await expect(page.getByRole("dialog")).toHaveCount(0);
          await expect(page.getByText("Inicia sesión para ver los detalles")).toHaveCount(0);
        });

        await test.step("US02.2.2 c3 · Cabecera y financiación: título, ubicación, galería, entidad promotora, capital, porcentaje, objetivo, fecha límite y aportación mínima", async () => {
          const overview = region(page, title);
          await expect(page.getByRole("link", { name: "Volver a oportunidades" })).toBeVisible();
          await expect(overview.getByText("Salt, Girona, España", { exact: true })).toBeVisible();
          await expect(overview.getByRole("figure")).toBeVisible();

          await expect(overview.getByText("Capital comprometido", { exact: true })).toBeVisible();
          await expect(overview.getByText(detailEur(COMMITTED), { exact: true })).toBeVisible();
          await expect(
            overview.getByText(`${fundedPercent(COMMITTED, TARGET)} del objetivo`, { exact: true }),
          ).toBeVisible();
          await expect(
            overview.getByRole("progressbar", { name: "Capital comprometido respecto al objetivo" }),
          ).toBeVisible();
          await expect(overview.getByText("Objetivo de financiación", { exact: true })).toBeVisible();
          await expect(overview.getByText(detailEur(TARGET), { exact: true })).toBeVisible();
          await expect(factValue(overview, "Fecha límite de financiación")).toContainText("Hora de Madrid");
          await expect(factValue(overview, "Aportación mínima")).toHaveText(detailEur(10_000));

          const promoter = region(page, "Entidad promotora");
          await expect(promoter.getByText(SEEDED_PROMOTER.legalName, { exact: true })).toBeVisible();
          await expect(factValue(promoter, "Proyectos publicados")).toHaveText("6");
          await expect(factValue(promoter, "Años de experiencia")).toContainText("7");
          await expect(factValue(promoter, "Ubicación")).toHaveText("Girona, España");
        });

        await test.step("US02.2.2 c4 · «Sector», «Fase de la empresa» y «Condiciones de la inversión»; sin «Características del inmueble»", async () => {
          const projectSummary = region(page, "Resumen del proyecto");
          await expect(factValue(projectSummary, "Sector")).toHaveText("Alimentación y bebidas");
          await expect(factValue(projectSummary, "Fase de la empresa")).toHaveText("Crecimiento");

          // Valoració prèvia 2.700.000 € i objectiu 300.000 €: s'ofereix el 10,0 % de l'empresa.
          const terms = region(page, "Condiciones de la inversión");
          await expect(factValue(terms, "Valoración previa a la inversión")).toHaveText(detailEur(270_000_000));
          await expect(factValue(terms, "Participación ofrecida")).toContainText(fundedPercent(1, 10));

          await expect(region(page, "Características del inmueble")).toHaveCount(0);
        });

        await test.step("US02.2.2 c5 · «Fechas del proyecto» solo tiene «Publicación» y «Fin de financiación»; no hay «Ubicación aproximada» ni mapa", async () => {
          await expect(region(page, "Fechas del proyecto").getByRole("listitem")).toHaveText([
            /^Publicación.*Fecha pasada$/,
            /^Fin de financiación.*Fecha futura$/,
          ]);

          await expect(region(page, "Ubicación aproximada")).toHaveCount(0);
          // Només el mapa: scripts de tercers (Stripe.js) poden afegir iframes ocults a la pàgina.
          await expect(page.locator('iframe[title="Mapa de la ubicación aproximada"]')).toHaveCount(0);
          await expect(page.locator('iframe[src*="openstreetmap"]')).toHaveCount(0);
        });

        await test.step("US02.2.2 c2 · El enlace directo tampoco redirige al inicio de sesión", async () => {
          await page.goto(detailUrl);

          await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
          await expect(page).toHaveURL(detailUrl);
        });

        await test.step("US02.2.2 c6 · En financiación, «Quiero invertir» está activo", async () => {
          await expectFundingState(page, "En financiación", true);
        });

        await test.step("US02.2.2 c7 · Sin sesión, «Quiero invertir» lleva al inicio de sesión", async () => {
          await page.getByRole("button", { name: "Quiero invertir" }).click();

          await expect(page).toHaveURL(/\/login$/);
          await expect(page.getByRole("form", { name: "Iniciar sesión" })).toBeVisible();
        });
      },
    );
  });
};
