import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SessionManager from "../src/components/SessionManager";
import MyWalletPage from "../src/pages/wallet/MyWalletPage";
import WalletWithdrawalPage from "../src/pages/wallet/WalletWithdrawalPage";
import { useAuthStore } from "../src/store/useAuthStore";
import { useWalletStore } from "../src/store/useWalletStore";

// Pàgines, stores, router, SessionManager i servei HTTP reals. Només se simula fetch: cada test
// declara què respondria el backend a cada ruta, i la sessió arriba per GET /api/auth/me.
type Handler = () => Promise<Response>;
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});
const reply = (body: unknown, status = 200): Handler => () => Promise.resolve(json(body, status));
// Respostes successives de la mateixa ruta; una petició de més fa fallar la consulta.
const inOrder = (...handlers: Handler[]): Handler => {
  let next = 0;
  return () => handlers[next++]?.() ?? Promise.reject(new Error("Resposta no prevista"));
};
// Resposta que el test allibera quan vol, per observar l'estat de càrrega.
const deferred = () => {
  let finish!: (response: Response) => void;
  const promise = new Promise<Response>((resolve) => { finish = resolve; });
  return { handler: (() => promise) as Handler, resolve: (response: Response) => act(async () => { finish(response); }) };
};
const serve = (routes: Record<string, Handler>) => fetchMock.mockImplementation((url, init) => {
  const handler = routes[`${init?.method} ${url}`];
  return handler ? handler() : Promise.reject(new Error(`Petició inesperada: ${init?.method} ${url}`));
});
// Totes les peticions fetes, en ordre: comparar-les senceres detecta qualsevol petició de més.
const requests = () => fetchMock.mock.calls.map(([url, init]) => `${init?.method} ${url}`);
const withdrawalCalls = () => fetchMock.mock.calls.filter(([url]) => url === "/api/me/wallet/withdrawals");

// Formes reals del backend: UserRead, BalanceRead i WithdrawalRead (app/schemas), amb l'IBAN
// emmascarat com el construeix routes/wallet.py.
const SESSION = reply({
  id: 1, email: "ana@example.com", first_name: "Ana", last_name: "García López",
  phone: "+34612345678", created_at: "2026-11-09T12:00:00Z", is_promoter: false,
});
const wallet = (available_cents: number, committed_cents = 0) => ({ available_cents, committed_cents, currency: "eur" });
const withdrawalRead = () => ({
  amount_cents: 10_000, masked_iban: "ES91****************1332", account_holder: "Ana García López",
  available_cents: 15_000, currency: "eur",
});
// El cos que ha de rebre el backend: IBAN sense espais i en majúscules, titular sense espais de més.
const BODY = { amount_cents: 10_000, iban: "ES9121000418450200051332", account_holder: "Ana García López" };

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  // reset() també avorta la consulta pendent i invalida respostes tardanes d'un test anterior.
  useWalletStore.getState().reset();
  useWalletStore.setState(useWalletStore.getInitialState(), true);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const renderWithdrawal = () => {
  render(
    <MemoryRouter initialEntries={["/my-balance/withdraw"]}>
      <SessionManager />
      <Routes>
        <Route path="/my-balance" element={<MyWalletPage />} />
        <Route path="/my-balance/withdraw" element={<WalletWithdrawalPage />} />
        <Route path="/login" element={<h1>Inicio de sesión simulado</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup({ delay: null });
};
const amountField = () => screen.getByRole("textbox", { name: /Importe a retirar/ });
const ibanField = () => screen.getByRole("textbox", { name: /IBAN de destino/ });
const holderField = () => screen.getByRole("textbox", { name: /Titular de la cuenta/ });
// Valor que acompanya cada etiqueta del resum de confirmació.
const summaryValue = (label: string) => screen.getByText(label, { selector: "dt" }).nextElementSibling;

// Omple el primer pas tal com ho escriuria algú (minúscules i espais de més) i passa a la confirmació.
const goToConfirmation = async (user: ReturnType<typeof userEvent.setup>) => {
  await screen.findByRole("form", { name: "Datos de la retirada" });
  await user.type(amountField(), "100");
  await user.type(ibanField(), "es91 2100 0418 4502 0005 1332");
  await user.type(holderField(), "  Ana   García López ");
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  await screen.findByRole("heading", { name: "Confirma la retirada" });
};

describe("Retirada: del formulari a POST /api/me/wallet/withdrawals", () => {
  it("retira 100,00 € amb un sol POST normalitzat i torna a «Mi saldo» amb el saldo actualitzat", async () => {
    const submission = deferred();
    serve({
      "GET /api/auth/me": SESSION,
      "GET /api/me/wallet": inOrder(reply(wallet(25_000, 5_000)), reply(wallet(15_000, 5_000))),
      "POST /api/me/wallet/withdrawals": submission.handler,
    });
    const user = renderWithdrawal();

    // Un formulari buit es queda al navegador: cap petició de retirada.
    await user.click(await screen.findByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Introduce el importe a retirar.")).toBeInTheDocument();
    expect(screen.getByText("Saldo disponible: 250,00 €")).toBeInTheDocument();

    await goToConfirmation(user);
    expect(summaryValue("Importe a retirar")).toHaveTextContent("100,00 €");
    expect(summaryValue("IBAN de destino")).toHaveTextContent("ES91 •••• •••• •••• •••• 1332");
    expect(screen.queryByText(/2100 0418/)).not.toBeInTheDocument();
    expect(summaryValue("Titular de la cuenta")).toHaveTextContent("Ana García López");
    expect(summaryValue("Saldo disponible tras la retirada")).toHaveTextContent("150,00 €");
    expect(requests()).toEqual(["GET /api/auth/me", "GET /api/me/wallet"]);

    await user.dblClick(screen.getByRole("button", { name: "Confirmar retirada" }));
    expect(screen.getByRole("button", { name: "Procesando…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Volver" })).toBeDisabled();
    expect(withdrawalCalls()).toHaveLength(1);
    const [url, init] = withdrawalCalls()[0];
    expect(url).toBe("/api/me/wallet/withdrawals");
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("include");
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(String(init?.body))).toEqual(BODY);

    await submission.resolve(json(withdrawalRead()));
    const notice = await screen.findByText("Retirada realizada");
    expect(notice.closest("[role=status]")).toHaveTextContent("Se han retirado 100,00 € de tu saldo disponible.");
    const card = screen.getByRole("region", { name: "Saldo disponible" });
    expect(await within(card).findByText("150,00 €")).toBeInTheDocument();
    expect(requests()).toEqual([
      "GET /api/auth/me", "GET /api/me/wallet", "POST /api/me/wallet/withdrawals", "GET /api/me/wallet",
    ]);
  });

  it("si el saldo ha baixat (409) ho indica, torna a llegir el saldo i conserva les dades escrites", async () => {
    serve({
      "GET /api/auth/me": SESSION,
      "GET /api/me/wallet": inOrder(reply(wallet(25_000, 5_000)), reply(wallet(5_000, 5_000))),
      "POST /api/me/wallet/withdrawals": reply({ detail: "Insufficient available balance" }, 409),
    });
    const user = renderWithdrawal();
    await goToConfirmation(user);
    await user.click(screen.getByRole("button", { name: "Confirmar retirada" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tu saldo disponible ya no cubre este importe. Vuelve atrás y revisa el importe.",
    );
    expect(screen.getByRole("heading", { name: "Confirma la retirada" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Volver" }));
    expect(await screen.findByText("Saldo disponible: 50,00 €")).toBeInTheDocument();
    expect(amountField()).toHaveValue("100,00");
    expect(ibanField()).toHaveValue("ES91 2100 0418 4502 0005 1332");
    expect(holderField()).toHaveValue("Ana García López");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    // Amb el saldo nou, el mateix import ja no passa la validació local.
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("El importe supera tu saldo disponible.")).toBeInTheDocument();
    expect(requests()).toEqual([
      "GET /api/auth/me", "GET /api/me/wallet", "POST /api/me/wallet/withdrawals", "GET /api/me/wallet",
    ]);
  });

  it.each([
    ["un 422 de validació", reply({ detail: [{
      type: "value_error", loc: ["body", "iban"], msg: "Value error, Invalid IBAN",
      input: "ES9121000418450200051332", ctx: { error: {} },
    }] }, 422), "Los datos de la retirada no son válidos. Vuelve atrás y revísalos."],
    // Un error no controlat de FastAPI arriba com a text pla, no com a JSON.
    ["un 500 del servidor", () => Promise.resolve(new Response("Internal Server Error", {
      status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" },
    })), "No se ha podido realizar la retirada. Inténtalo de nuevo."],
    ["un error de xarxa", () => Promise.reject(new TypeError("Failed to fetch")),
      "No se ha podido realizar la retirada. Inténtalo de nuevo."],
  ])("després d'%s conserva la confirmació i es pot tornar a enviar", async (_case, failure, message) => {
    serve({
      "GET /api/auth/me": SESSION,
      "GET /api/me/wallet": inOrder(reply(wallet(25_000, 5_000)), reply(wallet(15_000, 5_000))),
      "POST /api/me/wallet/withdrawals": inOrder(failure, reply(withdrawalRead())),
    });
    const user = renderWithdrawal();
    await goToConfirmation(user);
    await user.click(screen.getByRole("button", { name: "Confirmar retirada" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(summaryValue("Importe a retirar")).toHaveTextContent("100,00 €");
    expect(summaryValue("Titular de la cuenta")).toHaveTextContent("Ana García López");
    expect(screen.getByRole("button", { name: "Volver" })).toBeEnabled();
    expect(withdrawalCalls()).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Confirmar retirada" }));
    expect(await screen.findByText("Retirada realizada")).toBeInTheDocument();
    expect(withdrawalCalls().map(([, init]) => JSON.parse(String(init?.body)))).toEqual([BODY, BODY]);
  });

  it("amb la sessió caducada en confirmar acaba al login sense cap missatge d'error", async () => {
    serve({
      "GET /api/auth/me": SESSION,
      "GET /api/me/wallet": reply(wallet(25_000, 5_000)),
      "POST /api/me/wallet/withdrawals": reply({ detail: "Invalid or missing session" }, 401),
    });
    const user = renderWithdrawal();
    await goToConfirmation(user);
    await user.click(screen.getByRole("button", { name: "Confirmar retirada" }));

    expect(await screen.findByRole("heading", { name: "Inicio de sesión simulado" })).toBeInTheDocument();
    expect(useAuthStore.getState().active_account).toBeNull();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryAllByText(/€/)).toHaveLength(0);
    expect(requests()).toEqual(["GET /api/auth/me", "GET /api/me/wallet", "POST /api/me/wallet/withdrawals"]);
  });
});

describe("Retirada: el formulari depèn de GET /api/me/wallet", () => {
  it("sense saldo disponible no ofereix el formulari, encara que hi hagi saldo compromès", async () => {
    serve({ "GET /api/auth/me": SESSION, "GET /api/me/wallet": reply(wallet(0, 5_000)) });
    renderWithdrawal();

    expect(await screen.findByText("No tienes saldo disponible para retirar.")).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Datos de la retirada" })).not.toBeInTheDocument();
    expect(requests()).toEqual(["GET /api/auth/me", "GET /api/me/wallet"]);
  });

  it("si no pot llegir el saldo ho indica, i «Reintentar» el torna a demanar abans d'obrir el formulari", async () => {
    const retry = deferred();
    serve({
      "GET /api/auth/me": SESSION,
      "GET /api/me/wallet": inOrder(
        () => Promise.resolve(new Response("Internal Server Error", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } })),
        retry.handler,
      ),
    });
    const user = renderWithdrawal();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se ha podido consultar tu saldo");
    expect(screen.queryByRole("form", { name: "Datos de la retirada" })).not.toBeInTheDocument();

    await user.dblClick(screen.getByRole("button", { name: "Reintentar" }));
    expect(screen.getByRole("status")).toHaveTextContent("Cargando saldo…");
    expect(screen.queryByRole("form", { name: "Datos de la retirada" })).not.toBeInTheDocument();
    expect(requests()).toEqual(["GET /api/auth/me", "GET /api/me/wallet", "GET /api/me/wallet"]);

    await retry.resolve(json(wallet(25_000, 5_000)));
    expect(await screen.findByRole("form", { name: "Datos de la retirada" })).toBeInTheDocument();
    expect(screen.getByText("Saldo disponible: 250,00 €")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
