import { test, expect, type Page } from "@playwright/test";
import { E2E_PASSWORD, loginThroughUi, logoutThroughUi, mainNav, uniqueEmail, uniqueSuffix } from "../support/accounts";
import { checkBox } from "../support/pages";

interface PromotingEntityListItem {
  legal_name: string;
  founding_year: number | null;
  location: string | null;
}

export const registerPromoterRegistrationFlow = () => {
  test.describe("Flujo de Registro como Entidad Promotora (US01.9)", () => {
    test(
      "registra una cuenta normal y una entidad promotora y comprueba el acceso a «Mis oportunidades»",
      { tag: "@smoke" },
      async ({ page }) => {
        test.setTimeout(60_000);
        // Correus i raons socials únics per intent: un reintent no topa amb el compte anterior.
        const suffix = uniqueSuffix();
        const normalEmail = uniqueEmail("registro.normal");
        const promoterEmail = uniqueEmail("registro.promotora");
        const discardedLegalName = `Entidad Descartada E2E ${suffix} S.L.`;
        const legalName = `Promotora Registro E2E ${suffix} S.L.`;
        const entityLocation = "Girona, España";

        const promoterBox = () => page.getByRole("checkbox", { name: /Registrarme como entidad promotora/ });
        const entityGroup = () => page.getByRole("group", { name: "Datos de la entidad" });
        const legalNameField = () => page.getByLabel("Razón social");
        const foundingYearField = () => page.getByLabel(/Año de fundación/);
        const locationField = () => page.getByLabel(/Ubicación/);
        const stepStatus = () => page.getByRole("status").filter({ hasText: /^Paso \d de 2$/ });

        const fillPersonalDetails = async (email: string) => {
          await page.getByLabel("Nombre", { exact: true }).fill("Núria");
          await page.getByLabel("Apellidos").fill("Prueba-Soler");
          await page.getByLabel("Correo electrónico").fill(email);
          await page.getByLabel("Número", { exact: true }).fill("612 345 678");
        };

        // Completa el pas 2 i retorna el cos de l'única petició de registre.
        const completeAccessStep = async () => {
          await page.getByLabel("Contraseña", { exact: true }).fill(E2E_PASSWORD);
          await page.getByLabel("Confirma la contraseña").fill(E2E_PASSWORD);
          await checkBox(page.getByRole("checkbox", { name: "Acepto las condiciones de uso." }));
          await checkBox(page.getByRole("checkbox", { name: "He leído la política de privacidad." }));

          const requestPromise = page.waitForRequest(
            (request) => new URL(request.url()).pathname === "/api/auth/register" && request.method() === "POST",
          );
          await page.getByRole("button", { name: "Crear cuenta" }).click();
          const body = (await requestPromise).postDataJSON() as Record<string, unknown>;
          await expect(page).toHaveURL(/\/login$/);
          return body;
        };

        const publicEntities = async (current: Page) => {
          const response = await current.request.get("/api/promotingentity");
          expect(response.status()).toBe(200);
          return (await response.json()) as PromotingEntityListItem[];
        };

        await test.step("US01.9 c1 · La casilla «Registrarme como entidad promotora» está desmarcada y los datos de la entidad no se muestran", async () => {
          await page.goto("/register");
          await expect(stepStatus()).toHaveText("Paso 1 de 2");

          await expect(promoterBox()).not.toBeChecked();
          await expect(page.getByText("Necesario para publicar oportunidades.")).toBeVisible();
          await expect(entityGroup()).toHaveCount(0);
          await expect(legalNameField()).toHaveCount(0);
        });

        await test.step("US01.9 c2 · Al marcarla aparecen «Razón social» (obligatorio), «Año de fundación» y «Ubicación» (opcionales)", async () => {
          await checkBox(promoterBox());

          await expect(entityGroup()).toBeVisible();
          await expect(legalNameField()).toBeVisible();
          await expect(legalNameField()).toHaveAttribute("required", "");
          await expect(foundingYearField()).toBeVisible();
          await expect(locationField()).toBeVisible();
          await expect(entityGroup().getByText("(opcional)")).toHaveCount(2);
        });

        await test.step("US01.9 c3 · Al desmarcarla los campos desaparecen y el registro no envía ninguna entidad", async () => {
          await legalNameField().fill(discardedLegalName);
          await promoterBox().uncheck({ force: true });

          await expect(promoterBox()).not.toBeChecked();
          await expect(entityGroup()).toHaveCount(0);
          await expect(legalNameField()).toHaveCount(0);

          await fillPersonalDetails(normalEmail);
          await page.getByRole("button", { name: "Continuar" }).click();
          await expect(stepStatus()).toHaveText("Paso 2 de 2");

          const body = await completeAccessStep();
          expect(body).not.toHaveProperty("promoting_entity");
          expect(body.email).toBe(normalEmail);
        });

        await test.step("US01.9 c6 · La cuenta normal no tiene «Mis oportunidades» y la sección le indica que es solo para entidades promotoras", async () => {
          await loginThroughUi(page, { email: normalEmail, password: E2E_PASSWORD });
          await expect(mainNav(page).getByRole("link", { name: "Mi saldo" })).toBeVisible();
          await expect(mainNav(page).getByRole("link", { name: "Mis oportunidades" })).toHaveCount(0);

          await page.goto("/my-opportunities");
          await expect(
            page.getByRole("heading", { name: "Sección solo para entidades promotoras" }),
          ).toBeVisible();
          await expect(page.getByRole("button", { name: "Crear oportunidad" })).toHaveCount(0);

          // No s'ha creat cap entitat amb la raó social que es va escriure abans de desmarcar.
          const entities = await publicEntities(page);
          expect(entities.map((entity) => entity.legal_name)).not.toContain(discardedLegalName);

          await page.getByRole("link", { name: "Volver al inicio" }).click();
          await expect(page).toHaveURL(/\/$/);
          await logoutThroughUi(page);
        });

        await test.step("US01.9 c4 · Con la razón social vacía o un año no válido, «Continuar» no pasa al paso 2 y muestra el error bajo el campo", async () => {
          await page.goto("/register");
          await fillPersonalDetails(promoterEmail);
          await checkBox(promoterBox());

          await page.getByRole("button", { name: "Continuar" }).click();
          await expect(page.getByText("Introduce la razón social.")).toBeVisible();
          await expect(legalNameField()).toHaveAttribute("aria-invalid", "true");
          await expect(stepStatus()).toHaveText("Paso 1 de 2");

          await legalNameField().fill(legalName);
          await foundingYearField().fill("15");
          await page.getByRole("button", { name: "Continuar" }).click();
          await expect(page.getByText("Introduce un año de cuatro cifras, por ejemplo 2015.")).toBeVisible();
          await expect(foundingYearField()).toHaveAttribute("aria-invalid", "true");
          await expect(stepStatus()).toHaveText("Paso 1 de 2");

          const currentYear = new Date().getFullYear();
          await foundingYearField().fill(String(currentYear + 1));
          await page.getByRole("button", { name: "Continuar" }).click();
          await expect(
            page.getByText(`El año de fundación no puede ser posterior a ${currentYear}.`),
          ).toBeVisible();
          await expect(stepStatus()).toHaveText("Paso 1 de 2");
        });

        await test.step("US01.9 c5 · Completar los dos pasos con la casilla marcada crea la cuenta y la entidad y lleva al inicio de sesión", async () => {
          await foundingYearField().fill("2015");
          await locationField().fill(entityLocation);
          await page.getByRole("button", { name: "Continuar" }).click();
          await expect(stepStatus()).toHaveText("Paso 2 de 2");

          // Tornar enrere conserva la casella i les dades de l'entitat.
          await page.getByRole("button", { name: "Volver atrás" }).click();
          await expect(promoterBox()).toBeChecked();
          await expect(legalNameField()).toHaveValue(legalName);
          await expect(foundingYearField()).toHaveValue("2015");
          await expect(locationField()).toHaveValue(entityLocation);
          await page.getByRole("button", { name: "Continuar" }).click();

          const body = await completeAccessStep();
          expect(body.promoting_entity).toEqual({
            legal_name: legalName,
            founding_year: 2015,
            location: entityLocation,
          });

          const entity = (await publicEntities(page)).find((item) => item.legal_name === legalName);
          expect(entity, "La entidad promotora debe existir tras el registro").toBeDefined();
          expect(entity).toMatchObject({ founding_year: 2015, location: entityLocation });
        });

        await test.step("US01.9 c5 · Al iniciar sesión, la entidad promotora accede a «Mis oportunidades» y puede empezar a crear una oportunidad", async () => {
          await loginThroughUi(page, { email: promoterEmail, password: E2E_PASSWORD });

          await mainNav(page).getByRole("link", { name: "Mis oportunidades" }).click();
          await expect(page).toHaveURL(/\/my-opportunities$/);
          await expect(page.getByRole("heading", { level: 1, name: "Mis oportunidades" })).toBeVisible();
          await expect(page.getByText(legalName, { exact: true })).toBeVisible();
          await expect(
            page.getByRole("heading", { name: "Aún no has publicado ninguna oportunidad" }),
          ).toBeVisible();

          await page.getByRole("button", { name: "Crear oportunidad" }).click();
          const dialog = page.getByRole("dialog", { name: "¿Qué tipo de oportunidad quieres crear?" });
          await expect(dialog.getByRole("link", { name: /^Inmobiliaria/ })).toHaveAttribute(
            "href",
            "/my-opportunities/new/real-estate",
          );
          await expect(dialog.getByRole("link", { name: /^Empresarial/ })).toHaveAttribute(
            "href",
            "/my-opportunities/new/equity",
          );
          await dialog.getByRole("button", { name: "Cerrar diálogo" }).click();
          await expect(page.getByRole("dialog")).toHaveCount(0);
        });
      },
    );
  });
};
