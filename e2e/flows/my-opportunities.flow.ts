import { test, expect } from "@playwright/test";
import { createAccount, loginThroughUi, logoutThroughUi, mainNav, uniqueSuffix } from "../support/accounts";
import { eur, fundedPercent } from "../support/money";
import { listCards, SHORT_DATE, summary } from "../support/portfolio";
import { PORTFOLIO, SEEDED_PROMOTER } from "../support/seed";

// Cartera de `promotora.e2e`, en l'ordre de la pàgina. Cap flux hi compromet saldo: les xifres són fixes.
// La pendent de revisió va primer perquè s'ordena per la data de creació (la més recent); la resta,
// per la data de publicació, que el seed posa en l'ordre invers al dels identificadors.
const SEEDED_CARDS = [
  { title: PORTFOLIO.pendingReview, type: "Empresarial", status: "Pendiente de revisión", committed: 500_000, target: 6_000_000, investors: "1" },
  { title: PORTFOLIO.realEstateInFunding, type: "Inmobiliaria", status: "En financiación", committed: 3_000_000, target: 12_000_000, investors: "2" },
  { title: PORTFOLIO.landWithoutMap, type: "Inmobiliaria", status: "En financiación", committed: 0, target: 8_000_000, investors: "0" },
  { title: PORTFOLIO.equityInFunding, type: "Empresarial", status: "En financiación", committed: 18_450_000, target: 30_000_000, investors: "2" },
  { title: PORTFOLIO.funded, type: "Inmobiliaria", status: "Financiación completada", committed: 2_000_000, target: 2_000_000, investors: "2" },
  { title: PORTFOLIO.expired, type: "Inmobiliaria", status: "Plazo finalizado", committed: 1_525_000, target: 4_000_000, investors: "2" },
  { title: PORTFOLIO.closed, type: "Empresarial", status: "Oportunidad cerrada", committed: 1_200_000, target: 10_000_000, investors: "1" },
] as const;

export const registerMyOpportunitiesFlow = () => {
  test.describe("Flujo de Mis oportunidades (US05.2)", () => {
    test("la entidad promotora consulta el resumen, el orden, los estados, los inversores y el detalle de su cartera", async ({
      page,
    }) => {
      const card = (title: string) => page.getByRole("article", { name: title, exact: true });

      await test.step("US05.2 c2 · Sin sesión, «Mis oportunidades» lleva al inicio de sesión", async () => {
        await page.goto("/my-opportunities");
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole("heading", { level: 1, name: "Mis oportunidades" })).toHaveCount(0);
      });

      await test.step("US05.2 c1 · La entidad promotora tiene el enlace «Mis oportunidades» en la cabecera y entra en la sección", async () => {
        await loginThroughUi(page, SEEDED_PROMOTER);
        await mainNav(page).getByRole("link", { name: "Mis oportunidades" }).click();

        await expect(page).toHaveURL(/\/my-opportunities$/);
        await expect(page.getByRole("heading", { level: 1, name: "Mis oportunidades" })).toBeVisible();
        await expect(page.getByText(SEEDED_PROMOTER.legalName, { exact: true })).toBeVisible();
      });

      await test.step("US05.2 c3 · El resumen muestra «Capital comprometido», «Oportunidades publicadas» y «En financiación»", async () => {
        // Es comproven les tres xifres de la història. La pàgina n'afegeix una quarta
        // («Pendientes de revisión») que la història no demana: no es fixa aquí.
        const expected = [
          ["Capital comprometido", eur(26_175_000)],
          ["Oportunidades publicadas", "6"],
          ["En financiación", "3"],
        ] as const;
        for (const [index, [label, value]] of expected.entries()) {
          await expect(summary(page).getByRole("term").nth(index)).toHaveText(label);
          await expect(summary(page).getByRole("definition").nth(index)).toHaveText(value);
        }
      });

      await test.step("US05.2 c4 · La lista va de la más reciente a la más antigua y no incluye la oportunidad rechazada", async () => {
        await expect(listCards(page, "Oportunidades").getByRole("heading", { level: 3 })).toHaveText(
          SEEDED_CARDS.map((item) => item.title),
        );
        await expect(page.getByText(PORTFOLIO.rejected)).toHaveCount(0);
      });

      await test.step("US05.2 c4 · Cada oportunidad muestra tipo, fecha de publicación, progreso, número de inversores y fecha límite", async () => {
        for (const item of SEEDED_CARDS) {
          const current = card(item.title);
          const dateLabel = item.status === "Pendiente de revisión" ? "Creada el" : "Publicada el";

          await expect(current.getByText(item.type, { exact: true })).toBeVisible();
          await expect(current).toContainText(new RegExp(`${dateLabel} ${SHORT_DATE.source}`, "u"));
          await expect(
            current.getByText(
              `${eur(item.committed)} de ${eur(item.target)} · ${fundedPercent(item.committed, item.target)}`,
              { exact: true },
            ),
          ).toBeVisible();
          await expect(current.getByRole("progressbar", { name: "Financiación" })).toHaveAttribute(
            "aria-valuenow",
            String(Math.round((item.committed / item.target) * 100)),
          );
          await expect(current.getByRole("term")).toHaveText(["Inversores", "Fecha límite"]);
          await expect(current.getByRole("definition")).toHaveText([
            item.investors,
            new RegExp(`^${SHORT_DATE.source}$`, "u"),
          ]);
        }

        // Només el nombre d'inversors: mai qui són.
        await expect(page.getByText(/inversora\.e2e|capital\.e2e|Cartera-Núñez/)).toHaveCount(0);
      });

      await test.step("US05.2 c5 · Las oportunidades financiadas, vencidas y cerradas siguen en la lista con su estado", async () => {
        for (const item of SEEDED_CARDS) {
          await expect(card(item.title).getByText(item.status, { exact: true })).toBeVisible();
        }
      });

      await test.step("US05.2 c6 · El título abre el detalle de la oportunidad; la pendiente de revisión no tiene enlace", async () => {
        await expect(card(PORTFOLIO.pendingReview).getByRole("link")).toHaveCount(0);

        await card(PORTFOLIO.realEstateInFunding)
          .getByRole("link", { name: PORTFOLIO.realEstateInFunding })
          .click();
        await expect(page).toHaveURL(/\/opportunities\/real-estate\/\d+$/);
        await expect(
          page.getByRole("heading", { level: 1, name: PORTFOLIO.realEstateInFunding }),
        ).toBeVisible();
        await expect(page.getByText("En financiación", { exact: true })).toBeVisible();
      });
    });

    test("una cuenta sin entidad promotora no accede a la sección y una entidad nueva la ve vacía", async ({
      page,
    }) => {
      const legalName = `Promotora Vacía E2E ${uniqueSuffix()} S.L.`;

      await test.step("US05.2 c1 · Una cuenta sin entidad promotora no tiene el enlace «Mis oportunidades» en la cabecera", async () => {
        const account = await createAccount(page, "sin.entidad");
        await loginThroughUi(page, account);

        await expect(mainNav(page).getByRole("link", { name: "Mis inversiones" })).toBeVisible();
        await expect(mainNav(page).getByRole("link", { name: "Mis oportunidades" })).toHaveCount(0);
      });

      await test.step("US05.2 c2 · Sin entidad promotora, la dirección muestra «Sección solo para entidades promotoras» y «Volver al inicio»", async () => {
        await page.goto("/my-opportunities");

        await expect(
          page.getByRole("heading", { level: 1, name: "Sección solo para entidades promotoras" }),
        ).toBeVisible();
        await expect(page.getByRole("button", { name: "Crear oportunidad" })).toHaveCount(0);

        await page.getByRole("link", { name: "Volver al inicio" }).click();
        await expect(page).toHaveURL(/\/$/);
      });

      await test.step("US05.2 c7 · Una entidad promotora sin oportunidades ve «Aún no has publicado ninguna oportunidad»", async () => {
        await logoutThroughUi(page);
        const promoter = await createAccount(page, "promotora.vacia", {
          promotingEntity: { legal_name: legalName },
        });
        await loginThroughUi(page, promoter);
        await mainNav(page).getByRole("link", { name: "Mis oportunidades" }).click();

        await expect(page).toHaveURL(/\/my-opportunities$/);
        await expect(page.getByText(legalName, { exact: true })).toBeVisible();
        await expect(
          page.getByRole("heading", { name: "Aún no has publicado ninguna oportunidad" }),
        ).toBeVisible();
        await expect(page.getByText("Cuando crees una oportunidad, aparecerá aquí.")).toBeVisible();
        await expect(summary(page)).toHaveCount(0);
        await expect(page.getByRole("article")).toHaveCount(0);
      });
    });
  });
};
