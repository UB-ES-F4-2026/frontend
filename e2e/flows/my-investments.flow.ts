import { test, expect } from "@playwright/test";
import { createAccount, loginThroughUi, mainNav } from "../support/accounts";
import { equityPercent, eur, fundedPercent } from "../support/money";
import { expectWalletBalance, openMyBalance, type CatalogItem } from "../support/pages";
import { expectFundingState, factValue, listCards, SHORT_DATE, summary } from "../support/portfolio";
import { PORTFOLIO, SEEDED_INVESTOR, SEEDED_PROMOTER } from "../support/seed";

// Saldo i inversions d'`inversora.e2e`: cap flux hi escriu, així que les xifres són fixes.
const AVAILABLE = 123_456;
const COMMITTED = 195_000;

// Inversions en l'ordre de la pàgina (de la més recent a la més antiga): el seed les crea en
// l'ordre invers, amb dues aportacions separades a «Piso en Girona».
const SEEDED_INVESTMENTS = [
  { title: PORTFOLIO.realEstateInFunding, type: "Inmobiliaria", status: "En financiación", amount: 10_000, committed: 3_000_000, target: 12_000_000 },
  { title: PORTFOLIO.expired, type: "Inmobiliaria", status: "Plazo finalizado", amount: 25_000, committed: 1_525_000, target: 4_000_000 },
  { title: PORTFOLIO.funded, type: "Inmobiliaria", status: "Financiación completada", amount: 50_000, committed: 2_000_000, target: 2_000_000 },
  { title: PORTFOLIO.equityInFunding, type: "Empresarial", status: "En financiación", amount: 100_000, committed: 18_450_000, target: 30_000_000 },
  { title: PORTFOLIO.realEstateInFunding, type: "Inmobiliaria", status: "En financiación", amount: 10_000, committed: 3_000_000, target: 12_000_000 },
] as const;
const EQUITY_INDEX = 3;
const FUNDED_INDEX = 2;

export const registerMyInvestmentsFlow = () => {
  test.describe("Flujo de Mis inversiones (US05.1)", () => {
    test("una inversora consulta desde «Mi saldo» el resumen, la lista, los estados y el detalle de sus inversiones", async ({
      page,
    }) => {
      const cards = () => listCards(page, "Inversiones");

      await test.step("US05.1 c9 · Sin sesión, «Mis inversiones» lleva al inicio de sesión", async () => {
        await page.goto("/my-investments");
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole("heading", { level: 1, name: "Mis inversiones" })).toHaveCount(0);
      });

      await test.step("US04.1 · «Mi saldo» muestra 1.234,56 € disponibles y 1.950,00 € comprometidos", async () => {
        await loginThroughUi(page, SEEDED_INVESTOR);
        await openMyBalance(page);

        expect(eur(AVAILABLE)).toMatch(/^1\.234,56\s€$/);
        await expectWalletBalance(page, AVAILABLE, COMMITTED);
      });

      await test.step("US05.1 c1 · «Ver mis inversiones» en «Mi saldo» abre «Mis inversiones»", async () => {
        await page.getByRole("link", { name: /Ver mis inversiones/ }).click();

        await expect(page).toHaveURL(/\/my-investments$/);
        await expect(page.getByRole("heading", { level: 1, name: "Mis inversiones" })).toBeVisible();
        await expect(
          page.getByText("Entorno de simulación. Estos importes no representan dinero real."),
        ).toBeVisible();
      });

      await test.step("US05.1 c2 · El resumen muestra «Total comprometido», «Inversiones» y «En financiación», y el total coincide con el saldo comprometido", async () => {
        await expect(summary(page).getByRole("term")).toHaveText([
          "Total comprometido",
          "Inversiones",
          "En financiación",
        ]);
        // El total és el mateix import que «Saldo comprometido» a «Mi saldo» (pas anterior).
        await expect(summary(page).getByRole("definition")).toHaveText([eur(COMMITTED), "5", "3"]);
      });

      await test.step("US05.1 c3 · La lista va de la más reciente a la más antigua y repite la oportunidad con dos inversiones", async () => {
        await expect(cards().getByRole("heading", { level: 3 })).toHaveText(
          SEEDED_INVESTMENTS.map((item) => item.title),
        );
        await expect(page.getByRole("article", { name: PORTFOLIO.realEstateInFunding, exact: true })).toHaveCount(2);
      });

      await test.step("US05.1 c3 · Cada inversión muestra tipo, fecha, importe, estado y progreso de la oportunidad", async () => {
        for (const [index, item] of SEEDED_INVESTMENTS.entries()) {
          const current = cards().nth(index);

          await expect(current.getByText(item.type, { exact: true })).toBeVisible();
          await expect(current).toContainText(new RegExp(`Comprometida el ${SHORT_DATE.source}`, "u"));
          await expect(factValue(current, "Tu inversión")).toHaveText(eur(item.amount));
          await expect(current.getByText(item.status, { exact: true })).toBeVisible();
          await expect(
            current.getByText(
              `${eur(item.committed)} de ${eur(item.target)} · ${fundedPercent(item.committed, item.target)}`,
              { exact: true },
            ),
          ).toBeVisible();
        }
      });

      await test.step("US05.1 c4 · «Participación estimada» (0,033 %) solo aparece en la inversión empresarial", async () => {
        // 1.000,00 € ÷ (valoració prèvia 2.700.000 € + objectiu 300.000 €).
        const expected = equityPercent(100_000, 270_000_000, 30_000_000);
        expect(expected).toMatch(/^0,033\s%$/);

        await expect(cards().filter({ hasText: "Participación estimada" })).toHaveCount(1);
        await expect(
          factValue(cards().nth(EQUITY_INDEX), "Participación estimada"),
        ).toHaveText(expected);
      });

      await test.step("US05.1 c5 · El estado es el actual de cada oportunidad: «Financiación completada» y «Plazo finalizado»", async () => {
        await expect(
          page
            .getByRole("article", { name: PORTFOLIO.funded, exact: true })
            .getByText("Financiación completada", { exact: true }),
        ).toBeVisible();
        await expect(
          page
            .getByRole("article", { name: PORTFOLIO.expired, exact: true })
            .getByText("Plazo finalizado", { exact: true }),
        ).toBeVisible();
      });

      await test.step("US05.1 c7 · El título abre el detalle también de una oportunidad que ya no está en el catálogo", async () => {
        const catalog = await page.request.get("/api/opportunities");
        expect(catalog.status()).toBe(200);
        expect(((await catalog.json()) as CatalogItem[]).map((item) => item.title)).not.toContain(PORTFOLIO.funded);

        await cards().nth(FUNDED_INDEX).getByRole("link", { name: PORTFOLIO.funded }).click();
        await expect(page).toHaveURL(/\/opportunities\/real-estate\/\d+$/);
        await expect(page.getByRole("heading", { level: 1, name: PORTFOLIO.funded })).toBeVisible();
        await expectFundingState(page, "Financiación completada", false);
      });

      await test.step("US05.1 c1 · «Mis inversiones» en la cabecera vuelve a la lista", async () => {
        await mainNav(page).getByRole("link", { name: "Mis inversiones" }).click();

        await expect(page).toHaveURL(/\/my-investments$/);
        await expect(cards()).toHaveCount(SEEDED_INVESTMENTS.length);
      });
    });

    test("una cuenta nueva ve «Aún no has realizado ninguna inversión» y puede explorar las oportunidades", async ({
      page,
    }) => {
      await test.step("1. Registrar un usuario sin inversiones e iniciar sesión", async () => {
        const account = await createAccount(page, "sin.inversiones");
        await loginThroughUi(page, account);
      });

      await test.step("US05.1 c8 · Sin inversiones se muestra «Aún no has realizado ninguna inversión» y «Explorar oportunidades» lleva al catálogo", async () => {
        await mainNav(page).getByRole("link", { name: "Mis inversiones" }).click();

        await expect(page).toHaveURL(/\/my-investments$/);
        await expect(
          page.getByRole("heading", { name: "Aún no has realizado ninguna inversión" }),
        ).toBeVisible();
        await expect(
          page.getByText("Cuando comprometas una inversión en una oportunidad, aparecerá aquí."),
        ).toBeVisible();
        await expect(summary(page)).toHaveCount(0);
        await expect(page.getByRole("article")).toHaveCount(0);

        await page.getByRole("link", { name: "Explorar oportunidades" }).click();
        await expect(page).toHaveURL(/\/opportunities$/);
        await expect(page.getByRole("heading", { level: 1, name: "Oportunidades" })).toBeVisible();
      });
    });

    test("la aportación inicial a una oportunidad propia pendiente de revisión cuenta en el total, sin enlace al detalle", async ({
      page,
    }) => {
      // Aportació inicial de la promotora sembrada: 5.000,00 € a una empresarial de 60.000 €
      // amb valoració prèvia de 540.000 €.
      const INITIAL = 500_000;

      await test.step("1. Iniciar sesión como la entidad promotora y abrir «Mis inversiones»", async () => {
        await loginThroughUi(page, SEEDED_PROMOTER);
        await mainNav(page).getByRole("link", { name: "Mis inversiones" }).click();
        await expect(page).toHaveURL(/\/my-investments$/);
      });

      await test.step("US05.1 c6 · La inversión en la oportunidad propia muestra «Pendiente de revisión», sin enlace, y cuenta en el total pero no en «En financiación»", async () => {
        await expect(summary(page).getByRole("definition")).toHaveText([eur(INITIAL), "1", "0"]);

        const card = page.getByRole("article", { name: PORTFOLIO.pendingReview, exact: true });
        await expect(card.getByText("Pendiente de revisión", { exact: true })).toBeVisible();
        await expect(card.getByRole("heading", { level: 3 })).toHaveText(PORTFOLIO.pendingReview);
        await expect(card.getByRole("link")).toHaveCount(0);
        await expect(factValue(card, "Tu inversión")).toHaveText(eur(INITIAL));
        await expect(factValue(card, "Participación estimada")).toHaveText(
          equityPercent(INITIAL, 54_000_000, 6_000_000),
        );
      });
    });
  });
};
