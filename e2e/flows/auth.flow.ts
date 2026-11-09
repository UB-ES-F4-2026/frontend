import { test, expect } from "@playwright/test";

export const registerAuthFlow = () => {
  test.describe("Flujo de Autenticación (Registro, Login y Sesión)", () => {
    test("completa el ciclo de registro en 2 pasos, login, persistencia y logout", async ({ page }) => {
      // Generamos un correo único por ejecución para evitar colisiones (409) si se reintenta
      const uniqueEmail = `maria.e2e.${Date.now()}@example.com`;
      const password = "Password123!";

      await test.step("1. Navegar al registro desde la barra de navegación principal", async () => {
        await page.goto("/");
        const nav = page.getByRole("navigation", { name: "Navegación principal" });
        await nav.getByRole("link", { name: "Registrarse" }).click();

        await expect(page).toHaveURL(/\/register$/);
        await expect(page.getByRole("heading", { name: "Crear mi cuenta" })).toBeVisible();
        await expect(page.getByRole("status")).toHaveText("Paso 1 de 2");
      });

      await test.step("2. Completar Paso 1 (Datos personales) y verificar persistencia entre pasos", async () => {
        await page.getByLabel("Nombre", { exact: true }).fill("  María  ");
        await page.getByLabel("Apellidos").fill("  Prueba-López  ");
        await page.getByLabel("Correo electrónico").fill(uniqueEmail.toUpperCase());
        await page.getByLabel("Número", { exact: true }).fill("612 345 678");

        await page.getByRole("button", { name: "Continuar" }).click();
        await expect(page.getByRole("status")).toHaveText("Paso 2 de 2");

        // Comprobamos que volver atrás conserva los datos recortados (trim)
        await page.getByRole("button", { name: "Volver atrás" }).click();
        await expect(page.getByRole("status")).toHaveText("Paso 1 de 2");
        await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("María");
        await expect(page.getByLabel("Apellidos")).toHaveValue("Prueba-López");

        await page.getByRole("button", { name: "Continuar" }).click();
        await expect(page.getByRole("status")).toHaveText("Paso 2 de 2");
      });

      await test.step("3. Completar Paso 2 (Datos de acceso) y crear la cuenta", async () => {
        await page.getByLabel("Contraseña", { exact: true }).fill(password);
        await page.getByLabel("Confirma la contraseña").fill(password);

        await page.getByRole("checkbox", { name: "Acepto las condiciones de uso." }).check({force: true});
        await page.getByRole("checkbox", { name: "He leído la política de privacidad." }).check({force: true});

        await page.getByRole("button", { name: "Crear cuenta" }).click();

        // Tras crear la cuenta en el backend, redirige a /login
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
      });

      await test.step("4. Rechazar intento de login con contraseña incorrecta", async () => {
        await page.getByLabel("Correo electrónico").fill(uniqueEmail);
        await page.getByLabel("Contraseña").fill("ClaveIncorrecta99");
        await page.getByRole("button", { name: "Iniciar sesión" }).click();

        await expect(page.getByRole("alert")).toBeVisible();
        await expect(page).toHaveURL(/\/login$/);
      });

      await test.step("5. Iniciar sesión con las credenciales registradas y redirigir al inicio", async () => {
        await page.getByLabel("Correo electrónico").fill(uniqueEmail);
        await page.getByLabel("Contraseña").fill(password);
        await page.getByRole("button", { name: "Iniciar sesión" }).click();

        await expect(page).toHaveURL(/\/$/);

        // El Header debe reflejar la sesión activa mostrando "Cerrar sesión"
        const nav = page.getByRole("navigation", { name: "Navegación principal" });
        await expect(nav.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
        await expect(nav.getByRole("link", { name: "Registrarse" })).toBeHidden();
      });

      await test.step("6. Cerrar sesión desde el Header y volver a /login", async () => {
        const nav = page.getByRole("navigation", { name: "Navegación principal" });
        await nav.getByRole("button", { name: "Cerrar sesión" }).click();

        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole("form", { name: "Iniciar sesión" })).toBeVisible();
        await expect(nav.getByRole("link", { name: "Registrarse" })).toBeVisible();
      });
    });
  });
};