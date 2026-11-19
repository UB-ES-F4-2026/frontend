import { test, expect } from "@playwright/test";
import type { WalletBalance } from "../../src/store/useWalletStore";

export const registerBalanceFlow = () => {
  test.describe("Flujo de Consulta de Saldo (Mi saldo)", () => {
    test("inicia sesión, accede a 'Mi saldo' desde el header, comprueba el saldo y cierra sesión", async ({
      page,
    }) => {
      const uniqueEmail = `saldo.e2e.${Date.now()}@example.com`;
      const password = "Password123!";
      let balance: WalletBalance | undefined;

      await test.step("1. Registrar usuario nuevo e iniciar sesión", async () => {
        const regRes = await page.request.post("/api/auth/register", {
          data: {
            first_name: "María",
            last_name: "Saldo-Cero",
            email: uniqueEmail,
            phone: "+34612345678",
            password,
          },
        });
        expect(regRes.ok()).toBeTruthy();

        await page.goto("/login");
        await page.getByLabel("Correo electrónico").fill(uniqueEmail);
        await page.getByLabel("Contraseña").fill(password);
        await page.getByRole("button", { name: "Iniciar sesión" }).click();

        await expect(page).toHaveURL(/\/$/);
      });

      await test.step("2. Navegar a 'Mi saldo' desde el Header", async () => {
        const nav = page.getByRole("navigation", { name: "Navegación principal" });
        const balanceLink = nav.getByRole("link", { name: "Mi saldo" });

        await expect(balanceLink).toBeVisible();
        const balanceResponsePromise = page.waitForResponse(
          (response) =>
            response.url().includes("/api/me/wallet") &&
            response.request().method() === "GET"
        );
        await balanceLink.click();

        await expect(page).toHaveURL(/\/my-balance$/);
        await expect(
          page.getByRole("heading", { level: 1, name: "Mi saldo" })
        ).toBeVisible();
        await expect(
          page.getByText("Entorno de simulación. Este saldo no representa dinero real.")
        ).toBeVisible();

        const balanceResponse = await balanceResponsePromise;
        expect(balanceResponse.ok()).toBeTruthy();
        balance = (await balanceResponse.json()) as WalletBalance;
      });

      await test.step("3. Comprobar el saldo disponible devuelto por la API", async () => {
        if (!balance) throw new Error("La API no ha devuelto el saldo.");
        const formattedBalance = new Intl.NumberFormat("es-ES", {
          style: "currency",
          currency: "EUR",
          useGrouping: true,
        }).format(balance.available_cents / 100);

        const balanceRegion = page.getByRole("region", {
          name: "Saldo disponible",
        });
        await expect(balanceRegion).toBeVisible();
        await expect(
          balanceRegion.getByText(formattedBalance, { exact: true })
        ).toBeVisible();
        if (balance.available_cents === 0) {
          await expect(
            balanceRegion.getByText(`Tu saldo disponible es de ${formattedBalance}`)
          ).toBeVisible();
        }
      });

      await test.step("4. Cerrar sesión desde el Header y verificar redirección", async () => {
        const nav = page.getByRole("navigation", { name: "Navegación principal" });
        await nav.getByRole("button", { name: "Cerrar sesión" }).click();

        await expect(page).toHaveURL(/\/login$/);
        await expect(nav.getByRole("link", { name: "Mi saldo" })).toBeHidden();
        await expect(nav.getByRole("link", { name: "Registrarse" })).toBeVisible();
      });
    });
  });
};