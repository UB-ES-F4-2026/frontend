import { test, expect } from "@playwright/test";
import type { Opportunity } from "../../src/store/useOpportunityStore";

export const registerRealEstateInvestmentFlow = () => {
  test.describe("Flujo de Oportunidades, Detalle Inmobiliario e Inversión", () => {
    test("intenta abrir una oportunidad empresarial sin sesión, inicia sesión desde el modal, accede a una inmobiliaria, pulsa invertir e interactúa con el mapa", async ({
      page,
    }) => {
      const uniqueEmail = `inversor.e2e.${Date.now()}@example.com`;
      const password = "Password123!";

      let equityTitle = "";
      let realEstateTitle = "";
      let realEstateId = 0;
      let searchTerm = "";

      await test.step("1. Acceder a /opportunities sin sesión y capturar el catálogo", async () => {
        const opportunitiesResponsePromise = page.waitForResponse(
          (res) =>
            res.url().includes("/api/opportunities") &&
            res.request().method() === "GET" &&
            res.status() === 200
        );

        await page.goto("/opportunities");
        await expect(
          page.getByRole("heading", { name: "Oportunidades" })
        ).toBeVisible();

        const response = await opportunitiesResponsePromise;
        const opportunities = (await response.json()) as Opportunity[];

        const equityOpp = opportunities.find((o) => o.type === "equity");
        const realEstateOpp =
          opportunities.find(
            (o) =>
              o.type === "real_estate" &&
              !o.date_closed &&
              o.committed_cents < o.target_amount_cents
          ) ?? opportunities.find((o) => o.type === "real_estate");

        expect(
          equityOpp,
          "Debe existir al menos una oportunidad empresarial (equity) en la BD"
        ).toBeDefined();
        expect(
          realEstateOpp,
          "Debe existir al menos una oportunidad inmobiliaria (real_estate) en la BD"
        ).toBeDefined();

        equityTitle = equityOpp!.title;
        realEstateTitle = realEstateOpp!.title;
        realEstateId = realEstateOpp!.id;
        searchTerm = realEstateTitle.split(/\s+/)[0];
      });

      await test.step("2. Pulsar en una oportunidad empresarial sin sesión y abrir el modal", async () => {
        await page.getByText(equityTitle).first().click();

        await expect(
          page.getByText("Inicia sesión para ver los detalles")
        ).toBeVisible();
        await expect(page).toHaveURL(/\/opportunities$/);

        await page.getByRole("button", { name: "Iniciar sesión" }).click();
        await expect(page).toHaveURL(/\/login$/);
      });

      await test.step("3. Crear cuenta de prueba e iniciar sesión en /login", async () => {
        const regRes = await page.request.post("/api/auth/register", {
          data: {
            first_name: "Sergio",
            last_name: "Inversor",
            email: uniqueEmail,
            phone: "+34612345678",
            password,
          },
        });
        expect(regRes.ok()).toBeTruthy();

        await page.getByLabel("Correo electrónico").fill(uniqueEmail);
        await page.getByLabel("Contraseña").fill(password);
        await page.getByRole("button", { name: "Iniciar sesión" }).click();

        await expect(page).toHaveURL(/\/$/);
      });

      await test.step("4. Buscar una oportunidad inmobiliaria del catálogo", async () => {
        const nav = page.getByRole("navigation", { name: "Navegación principal" });
        await nav.getByRole("link", { name: "Oportunidades" }).click();
        await expect(page).toHaveURL(/\/opportunities$/);

        const searchInput = page.getByPlaceholder("Buscar oportunidades...");
        await expect(searchInput).toBeVisible();

        const searchResponse = await page.request.get("/api/opportunities", {
          params: { name: searchTerm },
        });
        expect(searchResponse.ok()).toBeTruthy();
        const matchingOpportunities = (await searchResponse.json()) as Opportunity[];
        expect(matchingOpportunities.map((opportunity) => opportunity.id)).toContain(
          realEstateId
        );

        await searchInput.fill(searchTerm);
        await searchInput.press("Enter");

        await expect(
          page.getByText(
            `${matchingOpportunities.length} oportunidades encontradas`,
            { exact: true }
          )
        ).toBeVisible();
        await expect(page.getByText(realEstateTitle, { exact: true })).toBeVisible();
      });

      await test.step("5. Acceder a la oportunidad de tipo inmobiliario filtrada", async () => {
        await page.getByText(realEstateTitle, { exact: true }).first().click();

        await expect(page).toHaveURL(
          new RegExp(`/opportunities/real-estate/${realEstateId}$`)
        );
        await expect(
          page.getByRole("heading", { level: 1, name: realEstateTitle })
        ).toBeVisible();
      });

      await test.step("6. Pulsar en 'Quiero invertir', comprobar el diálogo de aportación y cancelarlo", async () => {
        const investButton = page.getByRole("button", { name: "Quiero invertir" });
        await expect(investButton).toBeEnabled();
        await investButton.click();

        // L'usuari és nou: el diàleg s'obre amb el seu saldo, però no es compromet res.
        const dialog = page.getByRole("dialog", { name: "Comprometer aportación" });
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText(realEstateTitle, { exact: true })).toBeVisible();
        await expect(dialog.getByRole("textbox", { name: /Importe de la aportación/ })).toBeVisible();

        await dialog.getByRole("button", { name: "Cancelar" }).click();
        await expect(dialog).toBeHidden();
      });

      await test.step("7. Interactuar con el mapa de ubicación aproximada", async () => {
        const locationSection = page.getByRole("region", {
          name: "Ubicación aproximada",
        });
        await locationSection.scrollIntoViewIfNeeded();
        await expect(locationSection).toBeVisible();

        const mapIframe = page.locator(
          'iframe[title="Mapa de la ubicación aproximada"]'
        );

        if ((await mapIframe.count()) > 0) {
          await expect(mapIframe).toBeVisible();
          await expect(mapIframe).toHaveAttribute(
            "src",
            /https:\/\/www\.openstreetmap\.org\/export\/embed\.html/
          );

          // Simulamos arrastre (panning) y zoom con el ratón sobre el mapa
          const box = await mapIframe.boundingBox();
          if (box) {
            const centerX = box.x + box.width / 2;
            const centerY = box.y + box.height / 2;

            await page.mouse.move(centerX, centerY);
            await page.mouse.down();
            await page.mouse.move(centerX + 60, centerY + 40, { steps: 10 });
            await page.mouse.up();
            await page.mouse.wheel(0, -120);
          }
        } else {
          await expect(locationSection.getByText("Mapa no disponible")).toBeVisible();
        }
      });
    });
  });
};