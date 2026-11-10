import { test, expect } from "@playwright/test";

export const registerBalanceFlow = () => {
  test.describe("Flujo de Consulta de Saldo (Mi saldo)", () => {
    test("inicia sesión, accede a 'Mi saldo' desde el header, comprueba que el saldo es 0,00 € y cierra sesión", async ({
      page,
    }) => {
      const uniqueEmail = `saldo.e2e.${Date.now()}@example.com`;
      const password = "Password123!";

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
        await balanceLink.click();

        await expect(page).toHaveURL(/\/my-balance$/);
        await expect(
          page.getByRole("heading", { level: 1, name: "Mi saldo" })
        ).toBeVisible();
        await expect(
          page.getByText("Entorno de simulación. Este saldo no representa dinero real.")
        ).toBeVisible();
      });

      await test.step("3. Comprobar que el valor del saldo disponible es 0,00 €", async () => {
        const balanceRegion = page.getByRole("region", {
          name: "Saldo disponible",
        });
        await expect(balanceRegion).toBeVisible();

        await expect(
          balanceRegion.getByText("0,00 €", { exact: true })
        ).toBeVisible();
        await expect(
          balanceRegion.getByText("Tu saldo disponible es de 0,00 €")
        ).toBeVisible();
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