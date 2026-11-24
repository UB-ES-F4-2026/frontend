import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MyWalletPage from "../src/pages/wallet/MyWalletPage";
import { useAuthStore } from "../src/store/useAuthStore";
import { useWalletStore } from "../src/store/useWalletStore";

// Pàgina, stores, router i servei HTTP reals: només simulem fetch (GET /api/me/wallet).
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});
// Resposta que el test allibera quan vol, per observar l'estat de càrrega.
const deferred = () => {
  let finish!: (response: Response) => void;
  const promise = new Promise<Response>((resolve) => { finish = resolve; });
  return { handler: () => promise, resolve: (response: Response) => act(async () => { finish(response); }) };
};
// BalanceRead i UserRead (backend: app/schemas/wallet.py i auth.py).
const wallet = (available_cents: number, committed_cents = 0) => ({ available_cents, committed_cents, currency: "eur" });
const account = () => ({
  id: 1, email: "ada@example.com", first_name: "Ada", last_name: "Lovelace",
  phone: "+34612345678", created_at: "2026-11-09T12:00:00Z", is_promoter: false,
});

beforeEach(() => {
  // Sessió iniciada al store real, com la deixa GET /api/auth/me: sense compte la pàgina no llegeix el saldo.
  useAuthStore.setState({
    ...useAuthStore.getInitialState(), active_account: account(), status: "success", sessionChecked: true,
  }, true);
  // reset() també avorta la consulta pendent i invalida respostes tardanes d'un test anterior.
  useWalletStore.getState().reset();
  useWalletStore.setState(useWalletStore.getInitialState(), true);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const renderPage = () => {
  render(
    <MemoryRouter initialEntries={["/my-balance"]}>
      <Routes>
        <Route path="/my-balance" element={<MyWalletPage />} />
        <Route path="/my-investments" element={<><h1>Inversiones simuladas</h1><Link to="/my-balance">Volver al saldo</Link></>} />
      </Routes>
    </MemoryRouter>,
  );
  return {
    user: userEvent.setup({ delay: null }),
    card: screen.getByRole("region", { name: "Saldo disponible" }),
  };
};
// Valor que acompanya una etiqueta del desglossament.
const valueOf = (label: string) => screen.getByText(label, { selector: "dt" }).nextElementSibling;

describe("Mi saldo: GET /api/me/wallet", () => {
  it("demana el saldo amb la cookie, no mostra cap import mentre carrega i després el formata", async () => {
    const balance = deferred();
    fetchMock.mockImplementationOnce(balance.handler);
    const { card } = renderPage();

    expect(within(card).getByRole("status")).toHaveTextContent("Cargando saldo…");
    expect(screen.queryAllByText(/€/)).toHaveLength(0);
    // Sense saber el disponible no es pot anar a retirar.
    expect(screen.getByRole("button", { name: "Retirar fondos" })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/me/wallet");
    expect(init?.method).toBe("GET");
    expect(init?.credentials).toBe("include");
    expect(init?.body).toBeUndefined();
    expect(init?.signal).toBeInstanceOf(AbortSignal);

    await balance.resolve(json(wallet(123_456, 10_000)));
    expect(await within(card).findByText("1.234,56 €")).toBeInTheDocument();
    expect(valueOf("Saldo comprometido")).toHaveTextContent("100,00 €");
    expect(valueOf("Total")).toHaveTextContent("1.334,56 €");
    expect(screen.queryByText("Cargando saldo…")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retirar fondos" })).toHaveAttribute("href", "/my-balance/withdraw");
    expect(screen.getByRole("link", { name: "Ingresar fondos" })).toHaveAttribute("href", "/my-balance/deposit");
    expect(screen.getByText("Entorno de simulación. Este saldo no representa dinero real.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("un compte nou veu 0,00 € i no pot retirar", async () => {
    fetchMock.mockResolvedValueOnce(json(wallet(0, 0)));
    const { card } = renderPage();

    expect(await within(card).findByText("Tu saldo disponible es de 0,00 €")).toBeInTheDocument();
    expect(valueOf("Saldo comprometido")).toHaveTextContent("0,00 €");
    expect(valueOf("Total")).toHaveTextContent("0,00 €");
    expect(screen.getByRole("button", { name: "Retirar fondos" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Retirar fondos" }))
      .toHaveAccessibleDescription("No tienes saldo disponible para retirar.");
    expect(screen.queryByRole("link", { name: "Retirar fondos" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("cada entrada torna a llegir el saldo i no mostra l'anterior com a vigent", async () => {
    const second = deferred();
    fetchMock.mockResolvedValueOnce(json(wallet(25_000, 5_000))).mockImplementationOnce(second.handler);
    const { user } = renderPage();
    expect(await screen.findByText("250,00 €")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /Ver mis inversiones/ }));
    expect(screen.getByRole("heading", { name: "Inversiones simuladas" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Volver al saldo" }));

    expect(screen.getByText("Cargando saldo…")).toBeInTheDocument();
    expect(screen.queryAllByText(/€/)).toHaveLength(0);
    await second.resolve(json(wallet(15_000, 15_000)));
    expect(await screen.findByText("150,00 €", { selector: "p" })).toBeInTheDocument();
    expect(valueOf("Total")).toHaveTextContent("300,00 €");
    expect(screen.queryByText("250,00 €")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("Mi saldo: errors sense cap zero fictici", () => {
  it.each([
    // Un error no controlat de FastAPI arriba com a text pla, no com a JSON.
    ["un 500 del servidor", () => Promise.resolve(new Response("Internal Server Error", {
      status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" },
    }))],
    ["un error de xarxa", () => Promise.reject(new TypeError("Failed to fetch"))],
  ])("amb %s avisa i «Reintentar» fa una sola consulta nova", async (_case, failure) => {
    const retry = deferred();
    fetchMock.mockImplementationOnce(failure).mockImplementationOnce(retry.handler);
    const { user, card } = renderPage();

    expect(await within(card).findByRole("alert")).toHaveTextContent("No se ha podido consultar tu saldo");
    expect(screen.queryAllByText(/€/)).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Retirar fondos" })).toBeDisabled();
    expect(screen.queryByText("No tienes saldo disponible para retirar.")).not.toBeInTheDocument();

    await user.dblClick(within(card).getByRole("button", { name: "Reintentar" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(within(card).getByRole("status")).toHaveTextContent("Cargando saldo…");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryAllByText(/€/)).toHaveLength(0);

    await retry.resolve(json(wallet(25_000, 0)));
    expect(await within(card).findByText("250,00 €", { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url, init]) => `${init?.method} ${url}`))
      .toEqual(["GET /api/me/wallet", "GET /api/me/wallet"]);
  });

  it.each([
    ["sense committed_cents", () => json({ available_cents: 25_000, currency: "eur" })],
    ["amb un import que no és un enter", () => json({ available_cents: "25000", committed_cents: 0, currency: "eur" })],
    ["amb un import negatiu", () => json({ available_cents: -1, committed_cents: 0, currency: "eur" })],
    ["que no és JSON", () => new Response("<html></html>", { status: 200, headers: { "Content-Type": "text/html" } })],
  ])("una resposta 200 %s és un error, no un saldo", async (_case, body) => {
    fetchMock.mockResolvedValueOnce(body());
    const { card } = renderPage();

    expect(await within(card).findByRole("alert")).toHaveTextContent("No se ha podido consultar tu saldo");
    expect(within(card).getByRole("button", { name: "Reintentar" })).toBeEnabled();
    expect(screen.queryAllByText(/€/)).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
