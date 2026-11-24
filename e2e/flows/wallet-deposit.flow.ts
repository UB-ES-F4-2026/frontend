import { test, expect } from "@playwright/test";
import { createAccount, loginThroughUi } from "../support/accounts";
import { eur } from "../support/money";
import { expectWalletBalance, openMyBalance } from "../support/pages";

// El pagament amb targeta (Stripe) no es prova aquí: necessita claus reals i l'iframe de
// Stripe, i es cobreix a la capa d'integració. Aquest flux cobreix la pantalla fins al pagament.
export const registerWalletDepositFlow = () => {
  test.describe("Flujo de Ingreso de Fondos, hasta el pago (US04.2)", () => {
    test("abre «Ingresar fondos» desde «Mi saldo», valida el importe y cancela sin cambios", async ({ page }) => {
      const amountField = () => page.getByRole("textbox", { name: /Importe a ingresar/ });

      await test.step("US04.2 c6 · Sin sesión, la pantalla de ingreso lleva al inicio de sesión", async () => {
        await page.goto("/my-balance/deposit");
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole("heading", { name: "Ingresar fondos" })).toHaveCount(0);
      });

      await test.step("1. Registrar un usuario nuevo e iniciar sesión", async () => {
        const account = await createAccount(page, "ingreso");
        await loginThroughUi(page, account);
      });

      await test.step("US04.2 c1 · En «Mi saldo», «Ingresar fondos» abre la pantalla con el importe, el mínimo de 0,50 € y el aviso de simulación", async () => {
        await openMyBalance(page);
        await page.getByRole("link", { name: "Ingresar fondos" }).click();

        await expect(page).toHaveURL(/\/my-balance\/deposit$/);
        await expect(page.getByRole("heading", { level: 1, name: "Ingresar fondos" })).toBeVisible();
        await expect(amountField()).toHaveValue("");
        await expect(page.getByText(`Importe mínimo: ${eur(50)}`)).toBeVisible();
        await expect(
          page.getByText(
            "Entorno de simulación: no se realizará ningún cargo real. Usa una tarjeta de prueba de Stripe.",
          ),
        ).toBeVisible();
      });

      await test.step("US04.2 c2 · «Continuar al pago» rechaza un importe inferior a 0,50 € y uno con más de dos decimales", async () => {
        const continueButton = page.getByRole("button", { name: "Continuar al pago" });

        await amountField().fill("0,49");
        await continueButton.click();
        await expect(page.getByText(`El ingreso mínimo es de ${eur(50)}.`)).toBeVisible();
        await expect(amountField()).toHaveAttribute("aria-invalid", "true");

        await amountField().fill("10,555");
        await continueButton.click();
        await expect(page.getByText("Introduce un importe válido con hasta dos decimales.")).toBeVisible();

        // Cap dels dos imports arriba al pas de pagament.
        await expect(page).toHaveURL(/\/my-balance\/deposit$/);
        await expect(continueButton).toBeVisible();
      });

      await test.step("US04.2 c5 · «Cancelar» en el paso del importe vuelve a «Mi saldo» sin cambios", async () => {
        await amountField().fill("100");
        await page.getByRole("button", { name: "Cancelar" }).click();

        await expect(page).toHaveURL(/\/my-balance$/);
        await expectWalletBalance(page, 0, 0);
        await expect(page.getByText("Ingreso realizado")).toHaveCount(0);
      });
    });
  });
};
