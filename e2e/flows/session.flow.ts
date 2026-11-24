import { test, expect } from "@playwright/test";
import { createAccount, loginThroughUi, mainNav, type E2EAccount } from "../support/accounts";
import { openMyBalance } from "../support/pages";

export const registerSessionFlow = () => {
  test.describe("Flujo de Sesión: cookie, rutas protegidas y cierre (TR05, US01.8 y BUG03)", () => {
    test("protege las rutas privadas, guarda el token fuera del alcance de la página, lo invalida al cerrar sesión y no lo recupera al volver atrás", async ({
      page,
      request,
    }) => {
      // `request` no comparteix galetes amb el navegador: serveix per provar l'API sense sessió
      // o amb un token concret.
      const withToken = (token: string) => ({ headers: { Cookie: `session=${token}` } });
      const sessionCookie = async () => (await page.context().cookies()).find((cookie) => cookie.name === "session");
      const logoutButton = () => mainNav(page).getByRole("button", { name: "Cerrar sesión" });
      const createAccountLink = () => page.getByRole("link", { name: "Crear cuenta" });
      let account: E2EAccount;
      let firstToken = "";
      let secondToken = "";

      await test.step("US01.8 CA06 y BUG03 · Un visitante no ve «Cerrar sesión» y la página de inicio le ofrece «Crear cuenta»", async () => {
        await page.goto("/");
        await expect(createAccountLink()).toBeVisible();
        await expect(mainNav(page).getByRole("link", { name: "Registrarse" })).toBeVisible();
        await expect(logoutButton()).toHaveCount(0);
      });

      await test.step("TR05 c2 · Sin token o con un token inválido, las rutas protegidas responden 401 y la web lleva al inicio de sesión", async () => {
        expect((await request.get("/api/me/wallet")).status()).toBe(401);
        expect((await request.get("/api/auth/me", withToken("token-que-no-existe"))).status()).toBe(401);

        await page.goto("/my-balance");
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole("heading", { level: 1, name: "Mi saldo" })).toHaveCount(0);
      });

      await test.step("TR05 c1 y c6 · El inicio de sesión entrega el token en una cookie HttpOnly, Secure y SameSite que la página no puede leer", async () => {
        account = await createAccount(page, "sesion");
        await loginThroughUi(page, account);

        const cookie = await sessionCookie();
        expect(cookie, "El login debe dejar la cookie «session»").toBeDefined();
        expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "Lax", path: "/" });
        // Sense data de caducitat: la galeta dura el que dura la sessió del navegador.
        expect(cookie!.expires).toBe(-1);
        firstToken = cookie!.value;

        const visibleToScripts = await page.evaluate(() =>
          [document.cookie, JSON.stringify(localStorage), JSON.stringify(sessionStorage), location.href].join("\n"),
        );
        expect(visibleToScripts).not.toContain(firstToken);
        expect(visibleToScripts).not.toContain("session=");
      });

      await test.step("BUG03 · Con sesión iniciada, la página de inicio no muestra «Crear cuenta», tampoco tras recargar", async () => {
        await expect(page).toHaveURL(/\/$/);
        await expect(page.getByRole("link", { name: "Ver oportunidades" })).toBeVisible();
        await expect(createAccountLink()).toHaveCount(0);

        await page.reload();
        await expect(logoutButton()).toBeVisible();
        await expect(page.getByRole("link", { name: "Ver oportunidades" })).toBeVisible();
        await expect(createAccountLink()).toHaveCount(0);
      });

      await test.step("TR05 c4 · Con el token ya invalidado en el servidor, la siguiente acción lleva al inicio de sesión", async () => {
        // La caducitat per inactivitat (1 h) no es pot esperar en un test: s'invalida el token
        // al servidor, que és el que troba el navegador quan la sessió ha caducat.
        expect((await request.post("/api/auth/logout", withToken(firstToken))).status()).toBe(204);

        await mainNav(page).getByRole("link", { name: "Mi saldo" }).click();
        await expect(page).toHaveURL(/\/login$/);
        await expect(logoutButton()).toHaveCount(0);
        await expect(mainNav(page).getByRole("link", { name: "Registrarse" })).toBeVisible();
      });

      await test.step("US01.8 CA09 · Después de perder la sesión se puede volver a iniciar", async () => {
        await loginThroughUi(page, account);
        secondToken = (await sessionCookie())!.value;
        expect(secondToken).not.toBe(firstToken);
        expect((await request.get("/api/auth/me", withToken(secondToken))).status()).toBe(200);
        await openMyBalance(page);
      });

      await test.step("US01.8 CA04 y TR05 c5 · «Cerrar sesión» no pide confirmación, borra la cookie y el servidor rechaza el token antiguo", async () => {
        // Una segona pestanya queda oberta amb la mateixa sessió per al pas CA08.
        const secondTab = await page.context().newPage();
        await secondTab.goto("/my-balance");
        await expect(secondTab.getByRole("heading", { level: 1, name: "Mi saldo" })).toBeVisible();

        let dialogs = 0;
        page.on("dialog", (dialog) => {
          dialogs += 1;
          void dialog.dismiss();
        });
        await logoutButton().click();

        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole("form", { name: "Iniciar sesión" })).toBeVisible();
        expect(dialogs).toBe(0);
        expect(await sessionCookie()).toBeUndefined();
        expect((await request.get("/api/auth/me", withToken(secondToken))).status()).toBe(401);
        expect((await request.get("/api/me/wallet", withToken(secondToken))).status()).toBe(401);
      });

      await test.step("US01.8 CA07 · Volver atrás no recupera la sesión ni muestra contenido protegido", async () => {
        // L'historial torna a una pàgina anterior de la sessió tancada: es mostra com a visitant.
        await page.goBack();
        await expect(mainNav(page).getByRole("link", { name: "Registrarse" })).toBeVisible();
        await expect(logoutButton()).toHaveCount(0);
        await expect(page.getByRole("heading", { level: 1, name: "Mi saldo" })).toHaveCount(0);

        await page.goto("/my-balance");
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole("heading", { level: 1, name: "Mi saldo" })).toHaveCount(0);
      });

      await test.step("US01.8 CA08 · Repetir el cierre desde otra pestaña no restaura la sesión ni muestra errores", async () => {
        const secondTab = page.context().pages()[1];
        await secondTab.getByRole("navigation", { name: "Navegación principal" }).getByRole("button", { name: "Cerrar sesión" }).click();

        await expect(secondTab).toHaveURL(/\/login$/);
        await expect(secondTab.getByRole("alert")).toHaveCount(0);
        expect(await sessionCookie()).toBeUndefined();
        await secondTab.close();
      });

      await test.step("US01.8 CA09 y BUG03 · Se puede volver a entrar y, al salir, la página de inicio vuelve a ofrecer «Crear cuenta»", async () => {
        await loginThroughUi(page, account);
        await expect(createAccountLink()).toHaveCount(0);

        await logoutButton().click();
        await expect(page).toHaveURL(/\/login$/);
        await page.goto("/");
        await expect(createAccountLink()).toBeVisible();
      });
    });
  });
};
