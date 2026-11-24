import { test, expect } from "@playwright/test";
import { createAccount, loginThroughUi } from "../support/accounts";
import { detailEur, equityPercent, eur } from "../support/money";
import {
  checkBox,
  detailResponse,
  expectWalletBalance,
  openOpportunityFromCatalog,
  type OpportunityDetail,
} from "../support/pages";
import { MUTABLE } from "../support/seed";

export const registerBusinessInvestmentFlow = () => {
  test.describe("Flujo de Inversión en una Oportunidad Empresarial (US03.1.2)", () => {
    test(
      "con 1.500,00 € de saldo invierte 1.000,00 € y comprueba la participación estimada, el detalle y «Mi saldo»",
      { tag: "@smoke" },
      async ({ page }) => {
        const title = MUTABLE.equityInvestment;
        const BALANCE = 150_000;
        const AMOUNT = 100_000;
        // Dades fixes de l'oportunitat sembrada: valoració prèvia 2.700.000 € i objectiu 300.000 €.
        const VALUATION = 270_000_000;
        const TARGET = 30_000_000;
        // El capital creix amb cada intent; la participació estimada no en depèn.
        let before: OpportunityDetail;
        let detailUrl = "";

        const dialog = (name: string) => page.getByRole("dialog", { name });
        const amountDialog = () => dialog("Comprometer inversión");
        const amountField = () => amountDialog().getByRole("textbox", { name: /Importe de la inversión/ });
        const estimatedEquity = () => amountDialog().getByRole("definition").nth(3);
        const continueWith = async (amount: string) => {
          await amountField().fill(amount);
          await amountDialog().getByRole("button", { name: "Continuar" }).click();
        };

        await test.step("1. Registrar un usuario con 1.500,00 € de saldo e iniciar sesión", async () => {
          const account = await createAccount(page, "inversion", { balanceCents: BALANCE });
          await loginThroughUi(page, account);
        });

        await test.step("2. Abrir desde el catálogo la oportunidad empresarial en financiación", async () => {
          before = await openOpportunityFromCatalog(page, title);
          detailUrl = page.url();

          await expect(page).toHaveURL(new RegExp(`/opportunities/equity/${before.id}$`));
          await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
          expect(before.target_amount_cents).toBe(TARGET);
          await expect(page.getByText(detailEur(before.committed_cents), { exact: true })).toBeVisible();
        });

        await test.step("US03.1.2 c1 · «Quiero invertir» abre «Comprometer inversión» con saldo, mínimo, pendiente e importe", async () => {
          await page.getByRole("button", { name: "Quiero invertir" }).click();

          await expect(amountDialog()).toBeVisible();
          await expect(amountDialog().getByText(title, { exact: true })).toBeVisible();
          await expect(amountDialog().getByRole("term")).toHaveText([
            "Saldo disponible",
            "Aportación mínima",
            "Pendiente",
            /^Participación estimada/,
          ]);
          await expect(amountDialog().getByRole("definition")).toHaveText([
            eur(BALANCE),
            eur(before.minimum_contribution_cents ?? 0),
            eur(TARGET - before.committed_cents),
            "—",
          ]);
          await expect(amountField()).toBeVisible();
        });

        await test.step("US03.1.2 c2 · 1.000,00 € equivalen a una «Participación estimada» del 0,033 % y se actualiza al cambiar el importe", async () => {
          expect(equityPercent(AMOUNT, VALUATION, TARGET)).toMatch(/^0,033\s%$/);

          await amountField().fill("1000");
          await expect(estimatedEquity()).toHaveText(equityPercent(AMOUNT, VALUATION, TARGET));

          await amountField().fill("500");
          await expect(estimatedEquity()).toHaveText(equityPercent(50_000, VALUATION, TARGET));
        });

        await test.step("US03.1.2 c3 · Un importe inferior al mínimo o con tres decimales no pasa a la confirmación", async () => {
          await continueWith("50");
          await expect(amountDialog().getByText(`La aportación mínima es de ${eur(10_000)}.`)).toBeVisible();

          await continueWith("1000,555");
          await expect(amountDialog().getByText("El importe no puede tener más de dos decimales.")).toBeVisible();
          await expect(dialog("Confirma tu inversión")).toHaveCount(0);
        });

        await test.step("US03.1.2 c4 · Con 1.500,00 € un importe de 2.000,00 € avisa de saldo insuficiente y enlaza a «Ingresar fondos»", async () => {
          await continueWith("2000");

          await expect(amountDialog().getByText("No tienes saldo suficiente para esta inversión.")).toBeVisible();
          await expect(amountDialog().getByRole("link", { name: "Ingresar fondos" })).toHaveAttribute(
            "href",
            "/my-balance/deposit",
          );
          await expect(dialog("Confirma tu inversión")).toHaveCount(0);
        });

        await test.step("US03.1.2 c9 · Cerrar el diálogo no cambia el capital ni el saldo", async () => {
          await amountDialog().getByRole("button", { name: "Cerrar diálogo" }).click();
          await expect(page.getByRole("dialog")).toHaveCount(0);

          await page.reload();
          await expect(page.getByText(detailEur(before.committed_cents), { exact: true })).toBeVisible();

          await page.getByRole("button", { name: "Quiero invertir" }).click();
          await expect(amountDialog().getByRole("definition").first()).toHaveText(eur(BALANCE));
          await expect(amountField()).toHaveValue("");
        });

        await test.step("US03.1.2 c5 · La confirmación muestra importe, oportunidad, valoración previa, participación y saldo restante; «Volver» conserva el importe y la casilla de riesgos activa el botón", async () => {
          await continueWith("1000");

          const confirmDialog = dialog("Confirma tu inversión");
          await expect(confirmDialog.getByRole("term")).toHaveText([
            "Inversión",
            "Oportunidad",
            "Valoración previa a la inversión",
            "Participación estimada",
            "Saldo disponible tras la inversión",
          ]);
          await expect(confirmDialog.getByRole("definition")).toHaveText([
            eur(AMOUNT),
            title,
            eur(VALUATION),
            equityPercent(AMOUNT, VALUATION, TARGET),
            eur(BALANCE - AMOUNT),
          ]);
          const confirmButton = confirmDialog.getByRole("button", { name: "Confirmar inversión" });
          await expect(confirmButton).toBeDisabled();

          await confirmDialog.getByRole("button", { name: "Volver" }).click();
          await expect(amountField()).toHaveValue("1.000,00");
          await amountDialog().getByRole("button", { name: "Continuar" }).click();

          await expect(confirmButton).toBeDisabled();
          await checkBox(
            confirmDialog.getByRole("checkbox", { name: /Entiendo que invertir en una empresa conlleva riesgos/ }),
          );
          await expect(confirmButton).toBeEnabled();
        });

        await test.step("US03.1.2 c6 · «Confirmar inversión» muestra «Inversión comprometida» con el importe y la participación, y «Mi saldo» queda en 500,00 € y 1.000,00 €", async () => {
          await dialog("Confirma tu inversión").getByRole("button", { name: "Confirmar inversión" }).click();

          const doneDialog = dialog("Inversión comprometida");
          await expect(doneDialog.getByRole("status")).toHaveText(
            `Has comprometido ${eur(AMOUNT)} en esta oportunidad, que equivalen a una participación estimada del ${equityPercent(AMOUNT, VALUATION, TARGET)}. Tu saldo disponible ahora es de ${eur(BALANCE - AMOUNT)}.`,
          );

          await doneDialog.getByRole("button", { name: "Ver mi saldo" }).click();
          await expect(page).toHaveURL(/\/my-balance$/);
          await expectWalletBalance(page, BALANCE - AMOUNT, AMOUNT);
        });

        await test.step("US03.1.2 c6 · El detalle de la oportunidad suma 1.000,00 € al capital comprometido", async () => {
          const after = await detailResponse(page, () => page.goto(detailUrl));

          expect(after.committed_cents).toBe(before.committed_cents + AMOUNT);
          await expect(page.getByText(detailEur(before.committed_cents + AMOUNT), { exact: true })).toBeVisible();
        });
      },
    );
  });
};
