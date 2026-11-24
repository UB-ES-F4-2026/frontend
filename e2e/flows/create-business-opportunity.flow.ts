import { test, expect } from "@playwright/test";
import { createAccount, loginThroughUi, mainNav, uniqueSuffix } from "../support/accounts";
import { eur, fundedPercent } from "../support/money";
import { catalogCard, catalogResponse, expectWalletBalance, openMyBalance } from "../support/pages";
import {
  continueStep,
  fillGeneralInfo,
  futureDeadline,
  openCreationForm,
  openMyOpportunities,
  sentToReviewNotice,
  stepHeading,
  submitForReview,
} from "../support/wizard";

export const registerCreateBusinessOpportunityFlow = () => {
  test.describe("Flujo de Creación de una Oportunidad Empresarial (US06.1.2)", () => {
    test("una entidad promotora crea una oportunidad empresarial, comprueba la participación ofrecida y reserva su aportación inicial", async ({
      page,
    }) => {
      test.setTimeout(90_000);
      const BALANCE = 800_000;
      // Xifres de la targeta: valoració prèvia 1.350.000 € i objectiu 150.000 € → 10,0 %.
      const VALUATION = 135_000_000;
      const TARGET = 15_000_000;
      const MINIMUM = 10_000;
      const INITIAL = 500_000;
      const suffix = uniqueSuffix();
      const title = `Obrador artesano E2E ${suffix}`;
      const deadline = futureDeadline();
      const offered = (targetCents: number) => fundedPercent(targetCents, VALUATION + targetCents);

      // El nom accessible de la llista repeteix l'etiqueta («Sector Sector*»): no pot ser exacte.
      const options = (name: RegExp) => page.getByRole("listbox", { name }).getByRole("option");
      const targetField = () => page.getByLabel(/Objetivo de financiación/);
      // Al pas «Financiación», l'única definició és la «Participación ofrecida».
      const equityOffered = () => page.getByRole("form").getByRole("definition");
      const reviewSection = (name: string) => page.getByRole("region", { name, exact: true });

      await test.step("1. Registrar una entidad promotora con 8.000,00 € de saldo y entrar en «Mis oportunidades»", async () => {
        const account = await createAccount(page, "promotora.empresarial", {
          balanceCents: BALANCE,
          promotingEntity: { legal_name: `Promotora Empresarial E2E ${suffix} S.L.` },
        });
        await loginThroughUi(page, account);
        await openMyOpportunities(page);
      });

      await test.step("US06.1.2 c1 · «Empresarial» abre «Nueva oportunidad empresarial» con los pasos «Información general», «Empresa», «Financiación» y «Revisión»", async () => {
        await openCreationForm(page, "Empresarial");

        await expect(page).toHaveURL(/\/my-opportunities\/new\/equity$/);
        await expect(page.getByRole("heading", { level: 1, name: "Nueva oportunidad empresarial" })).toBeVisible();
        await expect(page.getByRole("list", { name: "Pasos" }).getByRole("listitem")).toHaveText([
          /Información general/,
          /Empresa/,
          /Financiación/,
          /Revisión/,
        ]);
      });

      await test.step("US06.1.2 c2 · «Información general» es el mismo paso que en la oportunidad inmobiliaria", async () => {
        await fillGeneralInfo(page, {
          title,
          description: "Obrador de pan de masa madre con venta directa.\nLa ronda financia un segundo horno.",
          municipality: "Vic",
          province: "Barcelona",
          country: "España",
        });
        await continueStep(page);
        await expect(stepHeading(page, "Empresa")).toBeVisible();
      });

      await test.step("US06.1.2 c3 · «Empresa» ofrece los sectores y las fases de la tarjeta y exige una valoración previa positiva", async () => {
        await continueStep(page);
        await expect(page.getByText("Selecciona el sector.")).toBeVisible();
        await expect(page.getByText("Selecciona la fase de la empresa.")).toBeVisible();
        await expect(page.getByText("Introduce la valoración previa a la inversión.")).toBeVisible();
        await expect(stepHeading(page, "Empresa")).toBeVisible();

        await page.getByRole("button", { name: /Sector/ }).click();
        await expect(options(/Sector/)).toHaveText([
          "Tecnología",
          "Industria",
          "Alimentación y bebidas",
          "Comercio",
          "Salud",
          "Energía",
          "Turismo y ocio",
          "Otros servicios",
        ]);
        await page.getByRole("option", { name: "Alimentación y bebidas", exact: true }).click();

        await page.getByRole("button", { name: /Fase de la empresa/ }).click();
        await expect(options(/Fase de la empresa/)).toHaveText(["Idea", "Lanzamiento", "Crecimiento", "Consolidada"]);
        await page.getByRole("option", { name: "Crecimiento", exact: true }).click();

        const valuation = page.getByLabel(/Valoración previa a la inversión/);
        await valuation.fill("0");
        await continueStep(page);
        await expect(page.getByText("La valoración previa debe ser mayor que 0.")).toBeVisible();
        await expect(stepHeading(page, "Empresa")).toBeVisible();

        await valuation.fill("1350000");
        await continueStep(page);
        await expect(stepHeading(page, "Financiación")).toBeVisible();
      });

      await test.step("US06.1.2 c5 · Con una valoración de 1.350.000 € y un objetivo de 150.000 €, la «Participación ofrecida» es del 10,0 % y se actualiza al cambiar el objetivo", async () => {
        expect(offered(TARGET)).toMatch(/^10,0\s%$/);
        await expect(page.getByRole("form").getByRole("term")).toHaveText(["Participación ofrecida"]);
        await expect(equityOffered()).toHaveText("—");

        await targetField().fill("150000");
        await expect(equityOffered()).toHaveText(offered(TARGET));

        await targetField().fill("300000");
        await expect(equityOffered()).toHaveText(offered(30_000_000));

        await targetField().fill("150000");
        await expect(equityOffered()).toHaveText(offered(TARGET));
      });

      await test.step("US06.1.2 c6 · La aportación inicial es opcional y se valida contra el saldo disponible", async () => {
        await expect(page.getByText(eur(BALANCE), { exact: true })).toBeVisible();
        await page.getByLabel(/Aportación mínima/).fill("100");
        await page.getByLabel("Fecha límite de financiación").fill(deadline.input);

        const initial = page.getByLabel(/Tu aportación inicial/);
        await initial.fill("9000");
        await continueStep(page);
        await expect(page.getByText("No tienes saldo suficiente para esta aportación.")).toBeVisible();
        await expect(stepHeading(page, "Financiación")).toBeVisible();

        await initial.fill("5000");
        await continueStep(page);
        await expect(stepHeading(page, "Revisión")).toBeVisible();
      });

      await test.step("US06.1.2 c7 · «Revisión» resume la empresa y la participación, y al enviar la oportunidad aparece como «Empresarial» y «Pendiente de revisión»", async () => {
        const company = reviewSection("Empresa");
        await expect(company).toContainText("Alimentación y bebidas · Crecimiento");
        await expect(company).toContainText(eur(VALUATION));

        const funding = reviewSection("Financiación");
        await expect(funding.getByRole("term")).toHaveText([
          "Objetivo de financiación",
          "Aportación mínima",
          "Participación ofrecida",
          "Fecha límite",
          "Tu aportación inicial",
          "Saldo disponible tras el envío",
        ]);
        const values = funding.getByRole("definition");
        await expect(values.nth(0)).toHaveText(eur(TARGET));
        await expect(values.nth(1)).toHaveText(eur(MINIMUM));
        await expect(values.nth(2)).toHaveText(offered(TARGET));
        await expect(values.nth(4)).toHaveText(eur(INITIAL));
        await expect(values.nth(5)).toHaveText(eur(BALANCE - INITIAL));

        await submitForReview(page);
        await expect(sentToReviewNotice(page)).toContainText(`«${title}» se publicará cuando sea aprobada.`);

        const card = page.getByRole("article", { name: title });
        await expect(card).toContainText("Empresarial");
        await expect(card).toContainText("Pendiente de revisión");
        await expect(card.getByRole("link")).toHaveCount(0);
      });

      await test.step("US06.1.2 c8 · La aportación inicial queda reservada: 5.000,00 € y 1 inversor en la oportunidad, 3.000,00 € disponibles y 5.000,00 € comprometidos en «Mi saldo»", async () => {
        await expect(sentToReviewNotice(page)).toContainText(
          `Se han reservado ${eur(INITIAL)} de tu saldo como aportación inicial.`,
        );
        const card = page.getByRole("article", { name: title });
        await expect(card).toContainText(`${eur(INITIAL)} de ${eur(TARGET)} · ${fundedPercent(INITIAL, TARGET)}`);
        await expect(card.getByRole("definition")).toHaveText(["1", deadline.label]);

        await openMyBalance(page);
        await expectWalletBalance(page, BALANCE - INITIAL, INITIAL);
      });

      await test.step("US06.1.2 c8 · La aportación inicial aparece en «Mis inversiones» con su participación estimada", async () => {
        await page.getByRole("link", { name: /Ver mis inversiones/ }).click();
        await expect(page).toHaveURL(/\/my-investments$/);

        const investment = page.getByRole("article", { name: title });
        await expect(investment).toContainText("Empresarial");
        await expect(investment).toContainText("Pendiente de revisión");
        await expect(investment.getByRole("term")).toHaveText(["Tu inversión", "Participación estimada"]);
        // 5.000 € ÷ (1.350.000 € + 150.000 €) = 0,333 %.
        await expect(investment.getByRole("definition")).toHaveText([eur(INITIAL), /^0,333\s%$/]);
        await expect(investment.getByRole("link")).toHaveCount(0);
      });

      await test.step("US06.1.2 c7 · La oportunidad pendiente de revisión no aparece en el catálogo público", async () => {
        const catalog = await catalogResponse(page, () =>
          mainNav(page).getByRole("link", { name: "Oportunidades", exact: true }).click(),
        );
        expect(catalog.items.map((item) => item.title)).not.toContain(title);
        await expect(catalogCard(page, title)).toHaveCount(0);
      });
    });
  });
};
