import { test, expect } from "@playwright/test";
import { createAccount, loginThroughUi, logoutThroughUi } from "../support/accounts";
import { eur } from "../support/money";
import { expectWalletBalance, openMyBalance } from "../support/pages";

export const registerWalletWithdrawalFlow = () => {
  test.describe("Flujo de Retirada de Fondos (US04.3)", () => {
    test(
      "con 250,00 € retira 100,00 € a una cuenta bancaria y comprueba el saldo; sin saldo o sin sesión no puede retirar",
      { tag: "@smoke" },
      async ({ page }) => {
        const BALANCE = 25_000;
        const AMOUNT = 10_000;
        const IBAN = "ES91 2100 0418 4502 0005 1332";
        const HOLDER = "Ana García López";

        const amountField = () => page.getByRole("textbox", { name: /Importe a retirar/ });
        const ibanField = () => page.getByRole("textbox", { name: /IBAN de destino/ });
        const holderField = () => page.getByRole("textbox", { name: /Titular de la cuenta/ });
        const confirmationHeading = () => page.getByRole("heading", { name: "Confirma la retirada" });

        await test.step("US04.3 c8 · Sin sesión, la pantalla de retirada lleva al inicio de sesión", async () => {
          await page.goto("/my-balance/withdraw");
          await expect(page).toHaveURL(/\/login$/);
          await expect(page.getByRole("heading", { name: "Retirar fondos" })).toHaveCount(0);
        });

        await test.step("1. Registrar un usuario con 250,00 € de saldo e iniciar sesión", async () => {
          const account = await createAccount(page, "retirada", { balanceCents: BALANCE });
          await loginThroughUi(page, account);
        });

        await test.step("US04.3 c1 · Desde «Mi saldo», «Retirar fondos» abre la pantalla con importe, IBAN, titular, saldo disponible y aviso de simulación", async () => {
          await openMyBalance(page);
          await expectWalletBalance(page, BALANCE, 0);
          await page.getByRole("link", { name: "Retirar fondos" }).click();

          await expect(page).toHaveURL(/\/my-balance\/withdraw$/);
          await expect(page.getByRole("heading", { level: 1, name: "Retirar fondos" })).toBeVisible();
          await expect(amountField()).toBeVisible();
          await expect(ibanField()).toBeVisible();
          await expect(holderField()).toBeVisible();
          await expect(page.getByText(`Saldo disponible: ${eur(BALANCE)}`)).toBeVisible();
          await expect(
            page.getByText("Entorno de simulación: no se realizará ninguna transferencia real."),
          ).toBeVisible();
        });

        await test.step("US04.3 c3 · «Retirar todo» rellena el importe con todo el saldo", async () => {
          await page.getByRole("button", { name: "Retirar todo" }).click();
          await expect(amountField()).toHaveValue("250,00");
        });

        await test.step("US04.3 c4 · Un importe superior al saldo, un IBAN no válido y un titular vacío muestran su error y no pasan a la confirmación", async () => {
          await amountField().fill("250,01");
          await ibanField().fill("ES12 3456");
          await page.getByRole("button", { name: "Continuar" }).click();

          await expect(page.getByText("El importe supera tu saldo disponible.")).toBeVisible();
          await expect(page.getByText("Introduce un IBAN válido.")).toBeVisible();
          await expect(page.getByText("Introduce el titular de la cuenta.")).toBeVisible();
          await expect(confirmationHeading()).toHaveCount(0);

          await amountField().fill("0,49");
          await page.getByRole("button", { name: "Continuar" }).click();
          await expect(page.getByText(`La retirada mínima es de ${eur(50)}.`)).toBeVisible();

          await amountField().fill("10,555");
          await page.getByRole("button", { name: "Continuar" }).click();
          await expect(page.getByText("Introduce un importe válido con hasta dos decimales.")).toBeVisible();
          await expect(confirmationHeading()).toHaveCount(0);
        });

        await test.step("US04.3 c5 · La confirmación muestra importe, IBAN enmascarado, titular y saldo restante; «Volver» conserva los datos", async () => {
          await amountField().fill("100");
          await ibanField().fill(IBAN);
          await holderField().fill(HOLDER);
          await page.getByRole("button", { name: "Continuar" }).click();

          await expect(confirmationHeading()).toBeVisible();
          await expect(page.getByRole("term")).toHaveText([
            "Importe a retirar",
            "IBAN de destino",
            "Titular de la cuenta",
            "Saldo disponible tras la retirada",
          ]);
          const values = page.getByRole("definition");
          await expect(values.nth(0)).toHaveText(eur(AMOUNT));
          // Només es veuen els quatre primers i els quatre últims caràcters.
          await expect(values.nth(1)).toContainText("ES91 •••• •••• •••• •••• 1332");
          await expect(values.nth(1)).not.toContainText("2100");
          await expect(values.nth(2)).toHaveText(HOLDER);
          await expect(values.nth(3)).toHaveText(eur(BALANCE - AMOUNT));

          await page.getByRole("button", { name: "Volver" }).click();
          await expect(amountField()).toHaveValue("100,00");
          await expect(ibanField()).toHaveValue(IBAN);
          await expect(holderField()).toHaveValue(HOLDER);
        });

        await test.step("US04.3 c6 · «Confirmar retirada» vuelve a «Mi saldo» con «Retirada realizada» y el saldo baja a 150,00 €", async () => {
          await page.getByRole("button", { name: "Continuar" }).click();
          await page.getByRole("button", { name: "Confirmar retirada" }).click();

          await expect(page).toHaveURL(/\/my-balance$/);
          const notice = page.getByRole("status").filter({ hasText: "Retirada realizada" });
          await expect(notice).toContainText(`Se han retirado ${eur(AMOUNT)} de tu saldo disponible.`);
          await expectWalletBalance(page, BALANCE - AMOUNT, 0);

          // El saldo nou és al servidor i l'avís no es repeteix.
          await page.reload();
          await expectWalletBalance(page, BALANCE - AMOUNT, 0);
          await expect(page.getByText("Retirada realizada")).toHaveCount(0);
        });

        await test.step("US04.3 c7 · «Cancelar» y «Volver a mi saldo» regresan a «Mi saldo» sin cambios", async () => {
          await page.getByRole("link", { name: "Retirar fondos" }).click();
          await amountField().fill("50");
          await page.getByRole("button", { name: "Cancelar" }).click();
          await expect(page).toHaveURL(/\/my-balance$/);
          await expectWalletBalance(page, BALANCE - AMOUNT, 0);

          await page.getByRole("link", { name: "Retirar fondos" }).click();
          await amountField().fill("50");
          await page.getByRole("link", { name: "Volver a mi saldo" }).click();
          await expect(page).toHaveURL(/\/my-balance$/);
          await expectWalletBalance(page, BALANCE - AMOUNT, 0);
          await expect(page.getByText("Retirada realizada")).toHaveCount(0);
        });

        await test.step("US04.3 c2 · Con 0,00 € de saldo, «Retirar fondos» está desactivado y se explica el motivo", async () => {
          await logoutThroughUi(page);
          const withoutFunds = await createAccount(page, "retirada.sin.saldo");
          await loginThroughUi(page, withoutFunds);

          await openMyBalance(page);
          await expectWalletBalance(page, 0, 0);
          await expect(page.getByRole("button", { name: "Retirar fondos" })).toBeDisabled();
          await expect(page.getByRole("link", { name: "Retirar fondos" })).toHaveCount(0);
          await expect(page.getByText("No tienes saldo disponible para retirar.")).toBeVisible();

          // Tampoc per l'enllaç directe: no hi ha formulari.
          await page.goto("/my-balance/withdraw");
          await expect(page.getByText("No tienes saldo disponible para retirar.")).toBeVisible();
          await expect(page.getByRole("form", { name: "Datos de la retirada" })).toHaveCount(0);
        });
      },
    );
  });
};
