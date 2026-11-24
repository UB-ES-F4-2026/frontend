import { test, expect, type Page } from "@playwright/test";
import { createAccount, loginThroughUi } from "../support/accounts";
import { detailEur, equityPercent, eur, fundedPercent } from "../support/money";
import {
  catalogCard,
  checkBox,
  detailResponse,
  expectWalletBalance,
  openMyBalance,
  openOpportunityFromCatalog,
  searchCatalog,
  catalogResponse,
  type CatalogItem,
} from "../support/pages";
import { MUTABLE } from "../support/seed";

// A totes les bessones els falten 500,00 € per assolir l'objectiu.
const REMAINING = 50_000;

// El seed crea tres bessones de cada tipus, una per intent (1 execució + 2 reintents): es tria
// la primera que encara és al catàleg. Un intent que ja n'ha completat una troba la següent.
async function pickTwin(page: Page, prefix: string, type: CatalogItem["type"]) {
  const response = await page.request.get("/api/opportunities", { params: { name: prefix, type } });
  expect(response.status()).toBe(200);
  const twin = ((await response.json()) as CatalogItem[]).find(
    (item) => item.title.startsWith(prefix) && item.target_amount_cents - item.committed_cents === REMAINING,
  );
  expect(
    twin,
    `No queda ninguna oportunidad «${prefix}» a 500,00 € del objetivo: el seed crea tres, una por intento.`,
  ).toBeDefined();
  return twin!;
}

// El catàleg públic ja no ofereix l'oportunitat, ni a la llista ni cercant-la pel títol.
async function expectOutOfCatalog(page: Page, twin: CatalogItem) {
  const { items } = await catalogResponse(page, () => page.goto("/opportunities"));
  expect(items.map((item) => item.id)).not.toContain(twin.id);
  await expect(catalogCard(page, twin.title)).toHaveCount(0);

  // La cerca recorre a títols semblants (les altres bessones), però mai a la finançada.
  const search = await searchCatalog(page, twin.title);
  expect(search.items.map((item) => item.id)).not.toContain(twin.id);
  await expect(catalogCard(page, twin.title)).toHaveCount(0);
}

async function expectFunded(page: Page, targetCents: number) {
  await expect(page.getByText("Financiación completada", { exact: true })).toBeVisible();
  await expect(page.getByText("En financiación", { exact: true })).toHaveCount(0);
  await expect(page.getByText(detailEur(targetCents), { exact: true }).first()).toBeVisible();
  await expect(page.getByText(`${fundedPercent(1, 1)} del objetivo`, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Quiero invertir" })).toBeDisabled();
}

export const registerFundingCompletionFlow = () => {
  test.describe("Flujo de Cierre de Financiación (US03.1.1 y US03.1.2)", () => {
    test("dos inversores compiten por los últimos 500,00 € de una oportunidad inmobiliaria: el primero completa el objetivo y el segundo recibe el aviso de que ya no se admite", async ({
      page,
      browser,
      baseURL,
    }) => {
      let twin: CatalogItem;
      let secondPage: Page;
      const detailPath = () => `/opportunities/real-estate/${twin.id}`;
      const amountDialog = (current: Page) => current.getByRole("dialog", { name: "Comprometer aportación" });
      const confirmDialog = (current: Page) => current.getByRole("dialog", { name: "Confirma tu aportación" });

      // Deixa l'inversor a la pantalla de confirmació, amb la casella de riscos marcada.
      const prepareContribution = async (current: Page) => {
        await amountDialog(current).getByRole("textbox", { name: /Importe de la aportación/ }).fill("500");
        await amountDialog(current).getByRole("button", { name: "Continuar" }).click();
        await checkBox(
          confirmDialog(current).getByRole("checkbox", { name: /Entiendo que la inversión conlleva riesgos/ }),
        );
        await expect(confirmDialog(current).getByRole("button", { name: "Confirmar aportación" })).toBeEnabled();
      };

      await test.step("1. Registrar dos inversores con 500,00 € y elegir una oportunidad a 500,00 € de su objetivo", async () => {
        twin = await pickTwin(page, MUTABLE.realEstateTwins, "real_estate");
        const first = await createAccount(page, "cierre.primero", { balanceCents: REMAINING });
        const second = await createAccount(page, "cierre.segundo", { balanceCents: REMAINING });

        // El segon inversor fa servir un navegador propi: dues sessions alhora.
        const secondContext = await browser.newContext({ baseURL });
        secondPage = await secondContext.newPage();
        await loginThroughUi(secondPage, second);
        await loginThroughUi(page, first);
      });

      await test.step("2. El primer inversor abre la oportunidad desde el catálogo: sigue en financiación", async () => {
        const detail = await openOpportunityFromCatalog(page, twin.title);
        expect(detail.id).toBe(twin.id);
        await expect(page.getByText("En financiación", { exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: "Quiero invertir" })).toBeEnabled();
      });

      await test.step("US03.1.1 c9 · Con un pendiente inferior a la aportación mínima se permite aportar exactamente el resto", async () => {
        await page.getByRole("button", { name: "Quiero invertir" }).click();

        // La mínima de l'oportunitat és de 1.000,00 €, però només en queden 500,00 €.
        await expect(amountDialog(page).getByRole("definition")).toHaveText([
          eur(REMAINING),
          eur(REMAINING),
          eur(REMAINING),
        ]);
        await expect(
          amountDialog(page).getByText(
            `Solo quedan ${eur(REMAINING)} para alcanzar el objetivo: la aportación debe ser de este importe, sin superar tu saldo disponible.`,
          ),
        ).toBeVisible();

        await amountDialog(page).getByRole("textbox", { name: /Importe de la aportación/ }).fill("300");
        await amountDialog(page).getByRole("button", { name: "Continuar" }).click();
        await expect(
          amountDialog(page).getByText(
            `La aportación debe ser de ${eur(REMAINING)}, el importe pendiente para alcanzar el objetivo.`,
          ),
        ).toBeVisible();

        await prepareContribution(page);
      });

      await test.step("3. El segundo inversor llega a la confirmación de la misma aportación", async () => {
        await detailResponse(secondPage, () => secondPage.goto(detailPath()));
        await secondPage.getByRole("button", { name: "Quiero invertir" }).click();
        await prepareContribution(secondPage);
      });

      await test.step("US03.1.1 c6 · El primero aporta los 500,00 € que faltaban: «Financiación completada» y «Quiero invertir» desactivado", async () => {
        await confirmDialog(page).getByRole("button", { name: "Confirmar aportación" }).click();

        const doneDialog = page.getByRole("dialog", { name: "Aportación comprometida" });
        await expect(doneDialog.getByRole("status")).toHaveText(
          `Has comprometido ${eur(REMAINING)} en esta oportunidad. Tu saldo disponible ahora es de ${eur(0)}.`,
        );
        await doneDialog.getByRole("button", { name: "Cerrar", exact: true }).click();

        await expectFunded(page, twin.target_amount_cents);
      });

      await test.step("US03.1.1 c7 · El segundo confirma después: «Esta oportunidad ya no admite esta aportación.» y su saldo no cambia", async () => {
        await confirmDialog(secondPage).getByRole("button", { name: "Confirmar aportación" }).click();

        const alert = confirmDialog(secondPage).getByRole("alert");
        await expect(alert).toContainText("Esta oportunidad ya no admite esta aportación.");
        await expect(alert).toContainText("Cierra este diálogo para ver la oportunidad actualizada.");
        await expect(confirmDialog(secondPage).getByRole("button", { name: "Confirmar aportación" })).toBeDisabled();
        await expect(confirmDialog(secondPage).getByRole("button", { name: "Volver" })).toBeDisabled();

        // En tancar, el detall es torna a llegir i ja mostra l'objectiu assolit.
        await confirmDialog(secondPage).getByRole("button", { name: "Cerrar diálogo" }).click();
        await expect(secondPage.getByRole("dialog")).toHaveCount(0);
        await expectFunded(secondPage, twin.target_amount_cents);

        await openMyBalance(secondPage);
        await expectWalletBalance(secondPage, REMAINING, 0);
        await secondPage.context().close();
      });

      await test.step("US03.1.1 c6 · La oportunidad financiada sale del catálogo y su detalle sigue sin admitir inversiones", async () => {
        await expectOutOfCatalog(page, twin);

        await detailResponse(page, () => page.goto(detailPath()));
        await expectFunded(page, twin.target_amount_cents);

        await openMyBalance(page);
        await expectWalletBalance(page, 0, REMAINING);
      });
    });

    test("invierte los últimos 500,00 € de una oportunidad empresarial: «Financiación completada», sin botón de invertir y fuera del catálogo", async ({
      page,
    }) => {
      // Dades fixes de les bessones empresarials: valoració prèvia 900.000 € i objectiu 100.000 €.
      const VALUATION = 90_000_000;
      let twin: CatalogItem;
      const amountDialog = () => page.getByRole("dialog", { name: "Comprometer inversión" });
      const confirmDialog = () => page.getByRole("dialog", { name: "Confirma tu inversión" });

      await test.step("1. Registrar un inversor con 500,00 € y abrir una oportunidad empresarial a 500,00 € de su objetivo", async () => {
        twin = await pickTwin(page, MUTABLE.equityTwins, "equity");
        const account = await createAccount(page, "cierre.empresarial", { balanceCents: REMAINING });
        await loginThroughUi(page, account);

        const detail = await openOpportunityFromCatalog(page, twin.title);
        expect(detail.id).toBe(twin.id);
        await expect(page.getByText("En financiación", { exact: true })).toBeVisible();
      });

      await test.step("US03.1.2 c10 · Con un pendiente inferior a la aportación mínima se permite invertir exactamente el resto", async () => {
        await page.getByRole("button", { name: "Quiero invertir" }).click();

        await expect(amountDialog().getByRole("definition")).toHaveText([
          eur(REMAINING),
          eur(REMAINING),
          eur(REMAINING),
          "—",
        ]);
        await expect(
          amountDialog().getByText(
            `Solo quedan ${eur(REMAINING)} para alcanzar el objetivo: la inversión debe ser de este importe, sin superar tu saldo disponible.`,
          ),
        ).toBeVisible();

        await amountDialog().getByRole("textbox", { name: /Importe de la inversión/ }).fill("500");
        await amountDialog().getByRole("button", { name: "Continuar" }).click();
        await checkBox(
          confirmDialog().getByRole("checkbox", { name: /Entiendo que invertir en una empresa conlleva riesgos/ }),
        );
      });

      await test.step("US03.1.2 c7 · Al invertir los 500,00 € que faltaban: «Financiación completada» y «Quiero invertir» desactivado", async () => {
        await confirmDialog().getByRole("button", { name: "Confirmar inversión" }).click();

        const doneDialog = page.getByRole("dialog", { name: "Inversión comprometida" });
        await expect(doneDialog.getByRole("status")).toHaveText(
          `Has comprometido ${eur(REMAINING)} en esta oportunidad, que equivalen a una participación estimada del ${equityPercent(REMAINING, VALUATION, twin.target_amount_cents)}. Tu saldo disponible ahora es de ${eur(0)}.`,
        );
        await doneDialog.getByRole("button", { name: "Cerrar", exact: true }).click();

        await expectFunded(page, twin.target_amount_cents);
      });

      await test.step("US03.1.2 c7 · La oportunidad financiada sale del catálogo y su detalle sigue sin admitir inversiones", async () => {
        await expectOutOfCatalog(page, twin);

        await detailResponse(page, () => page.goto(`/opportunities/equity/${twin.id}`));
        await expectFunded(page, twin.target_amount_cents);

        await openMyBalance(page);
        await expectWalletBalance(page, 0, REMAINING);
      });
    });
  });
};
