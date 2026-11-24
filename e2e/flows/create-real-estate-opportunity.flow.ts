import { test, expect } from "@playwright/test";
import { createAccount, loginThroughUi, mainNav, uniqueSuffix } from "../support/accounts";
import { eur, fundedPercent } from "../support/money";
import { catalogCard, catalogResponse, expectWalletBalance, openMyBalance, searchCatalog } from "../support/pages";
import {
  chooseOption,
  continueStep,
  fillGeneralInfo,
  futureDeadline,
  openCreationForm,
  openMyOpportunities,
  PNG_1X1,
  sentToReviewNotice,
  stepHeading,
  submitForReview,
} from "../support/wizard";

export const registerCreateRealEstateOpportunityFlow = () => {
  test.describe("Flujo de Creación de una Oportunidad Inmobiliaria (US06.1.1)", () => {
    test(
      "una entidad promotora con 8.000,00 € crea una oportunidad inmobiliaria con 5.000,00 € de aportación inicial y la ve pendiente de revisión",
      { tag: "@smoke" },
      async ({ page }) => {
        test.setTimeout(90_000);
        const BALANCE = 800_000;
        const TARGET = 15_000_000;
        const MINIMUM = 10_000;
        const INITIAL = 500_000;
        // Títol i raó social únics per intent: l'oportunitat es reconeix sense dependre de cap altra.
        const suffix = uniqueSuffix();
        const title = `Local reformado E2E ${suffix}`;
        const legalName = `Promotora Inmobiliaria E2E ${suffix} S.L.`;
        const deadline = futureDeadline();

        const discardDialog = () => page.getByRole("alertdialog", { name: "¿Descartar la oportunidad?" });
        const emptyPortfolio = () => page.getByRole("heading", { name: "Aún no has publicado ninguna oportunidad" });
        const targetField = () => page.getByLabel(/Objetivo de financiación/);
        const minimumField = () => page.getByLabel(/Aportación mínima/);
        const deadlineField = () => page.getByLabel("Fecha límite de financiación");
        const initialField = () => page.getByLabel(/Tu aportación inicial/);
        const reviewSection = (name: string) => page.getByRole("region", { name, exact: true });

        await test.step("1. Registrar una entidad promotora con 8.000,00 € de saldo y entrar en «Mis oportunidades»", async () => {
          const account = await createAccount(page, "promotora.inmobiliaria", {
            balanceCents: BALANCE,
            promotingEntity: { legal_name: legalName, founding_year: 2015, location: "Sabadell, España" },
          });
          await loginThroughUi(page, account);
          await openMyOpportunities(page);

          await expect(page.getByText(legalName, { exact: true })).toBeVisible();
          await expect(emptyPortfolio()).toBeVisible();
          await expect(page.getByRole("article")).toHaveCount(0);
        });

        await test.step("US06.1.1 c1 · «Crear oportunidad» pregunta el tipo e «Inmobiliaria» abre «Nueva oportunidad inmobiliaria» con sus cuatro pasos", async () => {
          await openCreationForm(page, "Inmobiliaria");

          await expect(page).toHaveURL(/\/my-opportunities\/new\/real-estate$/);
          await expect(page.getByRole("heading", { level: 1, name: "Nueva oportunidad inmobiliaria" })).toBeVisible();
          const steps = page.getByRole("list", { name: "Pasos" }).getByRole("listitem");
          await expect(steps).toHaveText([/Información general/, /Inmueble/, /Financiación/, /Revisión/]);
          await expect(steps.first()).toHaveAttribute("aria-current", "step");
          await expect(stepHeading(page, "Información general")).toBeVisible();
        });

        await test.step("US06.1.1 c8 · «Cancelar» y «Volver a mis oportunidades» piden confirmación; al descartar no se crea nada", async () => {
          await page.getByLabel("Título").fill(title);

          await page.getByRole("button", { name: "Cancelar", exact: true }).click();
          await expect(discardDialog()).toBeVisible();
          await expect(discardDialog().getByText("Se perderán los datos introducidos.")).toBeVisible();
          await discardDialog().getByRole("button", { name: "Seguir editando" }).click();
          await expect(discardDialog()).toHaveCount(0);
          await expect(page).toHaveURL(/\/my-opportunities\/new\/real-estate$/);
          await expect(page.getByLabel("Título")).toHaveValue(title);

          await page.getByRole("button", { name: "Volver a mis oportunidades" }).click();
          await discardDialog().getByRole("button", { name: "Descartar" }).click();
          await expect(page).toHaveURL(/\/my-opportunities$/);
          await expect(emptyPortfolio()).toBeVisible();
          await expect(page.getByRole("article")).toHaveCount(0);
          await expect(sentToReviewNotice(page)).toHaveCount(0);

          await openCreationForm(page, "Inmobiliaria");
          await expect(page.getByLabel("Título")).toHaveValue("");
        });

        await test.step("US06.1.1 c2 · «Información general» exige título, descripción, ubicación y al menos una imagen; la primera es la portada", async () => {
          await continueStep(page);
          for (const message of [
            "Introduce el título.",
            "Introduce la descripción.",
            "Introduce el municipio.",
            "Introduce la provincia.",
            "Introduce el país.",
            "Añade al menos una imagen.",
          ]) {
            await expect(page.getByText(message, { exact: true })).toBeVisible();
          }
          await expect(stepHeading(page, "Información general")).toBeVisible();
          await expect(
            page.getByText("Al menos una imagen. JPG, PNG o WebP de hasta 5 MB. La primera imagen será la portada."),
          ).toBeVisible();

          // Un fitxer que no és JPG, PNG ni WebP es descarta amb el motiu i no compta com a imatge.
          const imageInput = page.getByLabel("Añadir imágenes");
          await imageInput.setInputFiles({ name: "notas.txt", mimeType: "text/plain", buffer: Buffer.from("notas") });
          await expect(page.getByText("«notas.txt» no es una imagen JPG, PNG o WebP.")).toBeVisible();
          await expect(page.getByRole("img", { name: "notas.txt" })).toHaveCount(0);

          await fillGeneralInfo(page, {
            title,
            description: "Reforma de un local en planta baja para alquiler.\nIncluye la renovación de las instalaciones.",
            municipality: "Sabadell",
            province: "Barcelona",
            country: "España",
          });
          await imageInput.setInputFiles({ name: "interior.png", mimeType: "image/png", buffer: PNG_1X1 });
          await expect(page.getByRole("img", { name: "interior.png" })).toBeVisible();

          // Només la primera imatge porta la marca de portada.
          const thumbnails = page.getByRole("group", { name: "Imágenes" }).getByRole("listitem");
          await expect(thumbnails.filter({ hasText: "Portada" })).toHaveCount(1);
          await expect(
            thumbnails.filter({ hasText: "Portada" }).getByRole("img", { name: "portada.png" }),
          ).toBeVisible();
          await expect(page.getByRole("button", { name: "Eliminar portada.png" })).toBeVisible();
          await expect(page.getByText("Añade al menos una imagen.")).toHaveCount(0);

          await continueStep(page);
          await expect(stepHeading(page, "Inmueble")).toBeVisible();
        });

        await test.step("US06.1.1 c3 · «Inmueble» pide finalidad, uso, tipo y superficie, y muestra viviendas, fin de obras e inicio del alquiler solo cuando corresponden", async () => {
          const housingUnits = () => page.getByLabel("Viviendas previstas");
          const worksEnd = () => page.getByLabel(/Finalización estimada de las obras/);
          const rentalStart = () => page.getByLabel(/Inicio estimado del alquiler/);

          await continueStep(page);
          for (const message of [
            "Selecciona la finalidad.",
            "Selecciona el uso previsto.",
            "Selecciona el tipo de activo.",
            "Introduce la superficie.",
          ]) {
            await expect(page.getByText(message, { exact: true })).toBeVisible();
          }
          await expect(housingUnits()).toHaveCount(0);
          await expect(worksEnd()).toHaveCount(0);
          await expect(rentalStart()).toHaveCount(0);

          // Sense obres, sense lloguer i sense habitatges: cap camp condicional.
          await chooseOption(page, /Finalidad/, "Adquisición");
          await chooseOption(page, /Uso previsto/, "Venta");
          await chooseOption(page, /Tipo de activo/, "Comercial");
          await expect(housingUnits()).toHaveCount(0);
          await expect(worksEnd()).toHaveCount(0);
          await expect(rentalStart()).toHaveCount(0);

          await chooseOption(page, /Finalidad/, "Rehabilitación");
          await expect(worksEnd()).toBeVisible();
          await chooseOption(page, /Uso previsto/, "Alquiler");
          await expect(rentalStart()).toBeVisible();
          await chooseOption(page, /Tipo de activo/, "Mixto");
          await expect(housingUnits()).toBeVisible();
          await chooseOption(page, /Tipo de activo/, "Residencial");
          await expect(housingUnits()).toBeVisible();

          // Amb «Residencial», el nombre d'habitatges és obligatori.
          await page.getByLabel("Superficie (m²)").fill("180");
          await continueStep(page);
          await expect(page.getByText("Introduce el número de viviendas previstas.")).toBeVisible();
          await expect(stepHeading(page, "Inmueble")).toBeVisible();

          await housingUnits().fill("4");
          await continueStep(page);
          await expect(stepHeading(page, "Financiación")).toBeVisible();
        });

        await test.step("US06.1.1 c4 · «Financiación» exige un objetivo positivo, un mínimo que no lo supere y una fecha límite futura", async () => {
          await expect(page.getByText(eur(BALANCE), { exact: true })).toBeVisible();

          await continueStep(page);
          await expect(page.getByText("Introduce el objetivo de financiación.")).toBeVisible();
          await expect(page.getByText("Introduce la aportación mínima.")).toBeVisible();
          await expect(page.getByText("Indica la fecha límite de financiación.")).toBeVisible();

          await targetField().fill("0");
          await minimumField().fill("100");
          await deadlineField().fill("2020-01-31T12:00");
          await continueStep(page);
          await expect(page.getByText("El objetivo de financiación debe ser mayor que 0.")).toBeVisible();
          await expect(page.getByText("La fecha límite debe ser posterior a la fecha actual.")).toBeVisible();

          await targetField().fill("150000");
          await minimumField().fill("200000");
          await deadlineField().fill(deadline.input);
          await continueStep(page);
          await expect(
            page.getByText("La aportación mínima no puede superar el objetivo de financiación."),
          ).toBeVisible();
          await expect(page.getByText("La fecha límite debe ser posterior a la fecha actual.")).toHaveCount(0);
          await expect(stepHeading(page, "Financiación")).toBeVisible();

          await minimumField().fill("100");
        });

        await test.step("US06.1.1 c5 · Con 8.000,00 € una aportación inicial de 9.000,00 € avisa de saldo insuficiente; debe estar entre el mínimo y el objetivo", async () => {
          await initialField().fill("9000");
          await continueStep(page);
          await expect(page.getByText("No tienes saldo suficiente para esta aportación.")).toBeVisible();
          await expect(stepHeading(page, "Financiación")).toBeVisible();

          await initialField().fill("50");
          await continueStep(page);
          await expect(
            page.getByText(`La aportación inicial debe ser de al menos ${eur(MINIMUM)}, la aportación mínima.`),
          ).toBeVisible();

          await initialField().fill("200000");
          await continueStep(page);
          await expect(
            page.getByText("La aportación inicial no puede superar el objetivo de financiación."),
          ).toBeVisible();
          await expect(stepHeading(page, "Financiación")).toBeVisible();

          await initialField().fill("5000");
          await continueStep(page);
          await expect(stepHeading(page, "Revisión")).toBeVisible();
        });

        await test.step("US06.1.1 c6 · «Revisión» resume los datos con «Editar» y «Enviar a revisión» solo se activa con la declaración de veracidad", async () => {
          const general = reviewSection("Información general");
          await expect(general).toContainText(title);
          await expect(general).toContainText("Sabadell, Barcelona, España");
          await expect(general.getByRole("definition").last()).toHaveText("2");

          const property = reviewSection("Inmueble");
          await expect(property).toContainText("Rehabilitación · Alquiler · Residencial");
          await expect(property).toContainText("180 m²");
          await expect(property.getByRole("term")).toContainText(["Viviendas previstas"]);

          const funding = reviewSection("Financiación");
          await expect(funding.getByRole("term")).toHaveText([
            "Objetivo de financiación",
            "Aportación mínima",
            "Fecha límite",
            "Tu aportación inicial",
            "Saldo disponible tras el envío",
          ]);
          const fundingValues = funding.getByRole("definition");
          await expect(fundingValues.nth(0)).toHaveText(eur(TARGET));
          await expect(fundingValues.nth(1)).toHaveText(eur(MINIMUM));
          await expect(fundingValues.nth(3)).toHaveText(eur(INITIAL));
          await expect(fundingValues.nth(4)).toHaveText(eur(BALANCE - INITIAL));

          // «Editar» torna al pas amb les dades intactes; es pot tornar a la revisió sense reescriure res.
          await page.getByRole("button", { name: "Editar Información general" }).click();
          await expect(stepHeading(page, "Información general")).toBeVisible();
          await expect(page.getByLabel("Título")).toHaveValue(title);
          await expect(page.getByRole("img", { name: "portada.png" })).toBeVisible();
          await continueStep(page);
          await expect(stepHeading(page, "Inmueble")).toBeVisible();
          await continueStep(page);
          await expect(stepHeading(page, "Financiación")).toBeVisible();
          await expect(initialField()).toHaveValue("5.000,00");
          await continueStep(page);
          await expect(stepHeading(page, "Revisión")).toBeVisible();

          await submitForReview(page);
        });

        await test.step("US06.1.1 c6 · Tras enviar vuelve a «Mis oportunidades» con «Oportunidad enviada a revisión» y la oportunidad «Pendiente de revisión»", async () => {
          await expect(sentToReviewNotice(page)).toContainText(`«${title}» se publicará cuando sea aprobada.`);

          const card = page.getByRole("article", { name: title });
          await expect(card).toContainText("Inmobiliaria");
          await expect(card).toContainText("Pendiente de revisión");
          // Encara no té detall públic: el títol no és un enllaç.
          await expect(card.getByRole("link")).toHaveCount(0);
        });

        await test.step("US06.1.1 c7 · La aportación inicial queda reservada: la oportunidad muestra 5.000,00 € y 1 inversor", async () => {
          await expect(sentToReviewNotice(page)).toContainText(
            `Se han reservado ${eur(INITIAL)} de tu saldo como aportación inicial.`,
          );

          const card = page.getByRole("article", { name: title });
          await expect(card).toContainText(
            `${eur(INITIAL)} de ${eur(TARGET)} · ${fundedPercent(INITIAL, TARGET)}`,
          );
          await expect(card.getByRole("term")).toHaveText(["Inversores", "Fecha límite"]);
          await expect(card.getByRole("definition")).toHaveText(["1", deadline.label]);
        });

        await test.step("US06.1.1 c6 · La oportunidad pendiente de revisión no aparece en el catálogo público", async () => {
          const catalog = await catalogResponse(page, () =>
            mainNav(page).getByRole("link", { name: "Oportunidades", exact: true }).click(),
          );
          expect(catalog.items.map((item) => item.title)).not.toContain(title);
          await expect(catalogCard(page, title)).toHaveCount(0);

          // La cerca pot proposar títols semblants, però mai l'oportunitat pendent.
          const search = await searchCatalog(page, title);
          expect(search.items.map((item) => item.title)).not.toContain(title);
          await expect(catalogCard(page, title)).toHaveCount(0);
        });

        await test.step("US06.1.1 c7 · «Mi saldo» muestra 3.000,00 € disponibles y 5.000,00 € comprometidos", async () => {
          await openMyBalance(page);
          await expectWalletBalance(page, BALANCE - INITIAL, INITIAL);
        });

        await test.step("US06.1.1 c7 · La aportación inicial aparece en «Mis inversiones» como pendiente de revisión", async () => {
          await page.getByRole("link", { name: /Ver mis inversiones/ }).click();
          await expect(page).toHaveURL(/\/my-investments$/);

          const investment = page.getByRole("article", { name: title });
          await expect(investment).toContainText("Inmobiliaria");
          await expect(investment).toContainText("Pendiente de revisión");
          await expect(investment.getByRole("term")).toHaveText(["Tu inversión"]);
          await expect(investment.getByRole("definition")).toHaveText([eur(INITIAL)]);
          await expect(investment.getByRole("link")).toHaveCount(0);

          // Compta al total compromès (el mateix import que a «Mi saldo»), però no com a «En financiación».
          const summary = page.getByLabel("Resumen", { exact: true });
          await expect(summary.getByRole("term")).toHaveText(["Total comprometido", "Inversiones", "En financiación"]);
          await expect(summary.getByRole("definition")).toHaveText([eur(INITIAL), "1", "0"]);
        });
      },
    );
  });
};
