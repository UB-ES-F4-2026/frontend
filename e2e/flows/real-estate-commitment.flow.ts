import { test, expect } from "@playwright/test";
import { createAccount, loginThroughUi } from "../support/accounts";
import { detailEur, eur, fundedPercent } from "../support/money";
import {
  checkBox,
  expectWalletBalance,
  openMyBalance,
  openOpportunityFromCatalog,
  type OpportunityDetail,
} from "../support/pages";
import { MUTABLE } from "../support/seed";

export const registerRealEstateCommitmentFlow = () => {
  test.describe("Flujo de Aportación a una Oportunidad Inmobiliaria (US03.1.1)", () => {
    test(
      "con 250,00 € de saldo compromete 100,00 € y comprueba el detalle y «Mi saldo»",
      { tag: "@smoke" },
      async ({ page }) => {
        const title = MUTABLE.realEstateCommitment;
        const BALANCE = 25_000;
        const AMOUNT = 10_000;
        // El capital de l'oportunitat creix amb cada intent: es llegeix i es comprova en relatiu.
        let before: OpportunityDetail;
        let remaining = 0;

        const dialog = (name: string) => page.getByRole("dialog", { name });
        const amountField = () =>
          dialog("Comprometer aportación").getByRole("textbox", { name: /Importe de la aportación/ });
        const continueWith = async (amount: string) => {
          await amountField().fill(amount);
          await dialog("Comprometer aportación").getByRole("button", { name: "Continuar" }).click();
        };

        await test.step("1. Registrar un usuario con 250,00 € de saldo e iniciar sesión", async () => {
          const account = await createAccount(page, "aportacion", { balanceCents: BALANCE });
          await loginThroughUi(page, account);
        });

        await test.step("2. Abrir desde el catálogo la oportunidad inmobiliaria en financiación", async () => {
          before = await openOpportunityFromCatalog(page, title);
          remaining = before.target_amount_cents - before.committed_cents;

          await expect(page).toHaveURL(new RegExp(`/opportunities/real-estate/${before.id}$`));
          await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
          await expect(page.getByText("En financiación", { exact: true })).toBeVisible();
          await expect(page.getByText(detailEur(before.committed_cents), { exact: true })).toBeVisible();
        });

        await test.step("US03.1.1 c1 · «Quiero invertir» abre «Comprometer aportación» con saldo, mínimo, pendiente e importe", async () => {
          await page.getByRole("button", { name: "Quiero invertir" }).click();

          const amountDialog = dialog("Comprometer aportación");
          await expect(amountDialog).toBeVisible();
          await expect(amountDialog.getByText(title, { exact: true })).toBeVisible();
          await expect(amountDialog.getByRole("term")).toHaveText([
            "Saldo disponible",
            "Aportación mínima",
            "Pendiente",
          ]);
          await expect(amountDialog.getByRole("definition")).toHaveText([
            eur(BALANCE),
            eur(before.minimum_contribution_cents ?? 0),
            eur(remaining),
          ]);
          await expect(amountField()).toBeVisible();
        });

        await test.step("US03.1.1 c2 · Un importe inferior al mínimo, superior al pendiente o con tres decimales no pasa a la confirmación", async () => {
          const amountDialog = dialog("Comprometer aportación");

          await continueWith("99,99");
          await expect(amountDialog.getByText(`La aportación mínima es de ${eur(10_000)}.`)).toBeVisible();

          await continueWith(String(remaining / 100 + 1));
          await expect(
            amountDialog.getByText(
              `El importe no puede superar los ${eur(remaining)} pendientes para alcanzar el objetivo.`,
            ),
          ).toBeVisible();

          await continueWith("100,555");
          await expect(amountDialog.getByText("El importe no puede tener más de dos decimales.")).toBeVisible();

          await expect(amountField()).toHaveAttribute("aria-invalid", "true");
          await expect(dialog("Confirma tu aportación")).toHaveCount(0);
        });

        await test.step("US03.1.1 c3 · Con 250,00 € un importe de 300,00 € avisa de saldo insuficiente y enlaza a «Ingresar fondos»", async () => {
          const amountDialog = dialog("Comprometer aportación");
          await continueWith("300");

          await expect(amountDialog.getByText("No tienes saldo suficiente para esta aportación.")).toBeVisible();
          await expect(amountDialog.getByRole("link", { name: "Ingresar fondos" })).toHaveAttribute(
            "href",
            "/my-balance/deposit",
          );
          await expect(dialog("Confirma tu aportación")).toHaveCount(0);
        });

        await test.step("US03.1.1 c8 · «Cancelar» cierra el diálogo sin cambiar el capital ni el saldo", async () => {
          await amountField().fill("100");
          await dialog("Comprometer aportación").getByRole("button", { name: "Cancelar" }).click();
          await expect(page.getByRole("dialog")).toHaveCount(0);

          await page.reload();
          await expect(page.getByText(detailEur(before.committed_cents), { exact: true })).toBeVisible();

          // En tornar a obrir, el camp és buit i el saldo és el mateix: no s'ha compromès res.
          await page.getByRole("button", { name: "Quiero invertir" }).click();
          await expect(dialog("Comprometer aportación").getByRole("definition").first()).toHaveText(eur(BALANCE));
          await expect(amountField()).toHaveValue("");
        });

        await test.step("US03.1.1 c4 · La confirmación muestra importe, oportunidad y saldo restante; «Volver» conserva el importe y la casilla de riesgos activa el botón", async () => {
          await continueWith("100");

          const confirmDialog = dialog("Confirma tu aportación");
          await expect(confirmDialog.getByRole("term")).toHaveText([
            "Aportación",
            "Oportunidad",
            "Saldo disponible tras la aportación",
          ]);
          await expect(confirmDialog.getByRole("definition")).toHaveText([
            eur(AMOUNT),
            title,
            eur(BALANCE - AMOUNT),
          ]);
          const confirmButton = confirmDialog.getByRole("button", { name: "Confirmar aportación" });
          await expect(confirmButton).toBeDisabled();

          await confirmDialog.getByRole("button", { name: "Volver" }).click();
          await expect(amountField()).toHaveValue("100,00");
          await dialog("Comprometer aportación").getByRole("button", { name: "Continuar" }).click();

          await expect(confirmButton).toBeDisabled();
          await checkBox(
            confirmDialog.getByRole("checkbox", { name: /Entiendo que la inversión conlleva riesgos/ }),
          );
          await expect(confirmButton).toBeEnabled();
        });

        await test.step("US03.1.1 c5 · «Confirmar aportación» muestra «Aportación comprometida» y el detalle suma 100,00 €", async () => {
          await dialog("Confirma tu aportación").getByRole("button", { name: "Confirmar aportación" }).click();

          const doneDialog = dialog("Aportación comprometida");
          await expect(doneDialog.getByRole("status")).toHaveText(
            `Has comprometido ${eur(AMOUNT)} en esta oportunidad. Tu saldo disponible ahora es de ${eur(BALANCE - AMOUNT)}.`,
          );
          await doneDialog.getByRole("button", { name: "Cerrar", exact: true }).click();
          await expect(page.getByRole("dialog")).toHaveCount(0);

          const committed = before.committed_cents + AMOUNT;
          const percent = `${fundedPercent(committed, before.target_amount_cents)} del objetivo`;
          await expect(page.getByText(detailEur(committed), { exact: true })).toBeVisible();
          await expect(page.getByText(percent, { exact: true })).toBeVisible();

          // El compromís és al servidor, no només a la pantalla.
          await page.reload();
          await expect(page.getByText(detailEur(committed), { exact: true })).toBeVisible();
          await expect(page.getByText(percent, { exact: true })).toBeVisible();
        });

        await test.step("US03.1.1 c5 · «Mi saldo» muestra 150,00 € disponibles y 100,00 € comprometidos", async () => {
          await openMyBalance(page);
          await expectWalletBalance(page, BALANCE - AMOUNT, AMOUNT);
        });
      },
    );
  });
};
