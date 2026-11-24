import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/app/App";
import SessionManager from "../src/components/SessionManager";
import { useAuthStore } from "../src/store/useAuthStore";
import { useInvestmentStore } from "../src/store/useInvestmentStore";
import { useOpportunityStore } from "../src/store/useOpportunityStore";
import { useWalletStore } from "../src/store/useWalletStore";

// La mateixa composició que src/main.tsx (SessionManager + App) amb stores, router i servei HTTP
// reals. Només se simula fetch: cada test declara les rutes que el backend respondria.
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

// Formes reals del backend: UserRead (schemas/auth.py), BalanceRead (schemas/wallet.py) i el 401
// de get_current_user (api/deps.py).
const account = (overrides: { id?: number; email?: string; is_promoter?: boolean } = {}) => ({
  id: 1, email: "ada@example.com", first_name: "Ada", last_name: "Lovelace",
  phone: "+34612345678", created_at: "2026-11-09T12:00:00Z", is_promoter: false, ...overrides,
});
const wallet = (available_cents: number, committed_cents = 0) => ({ available_cents, committed_cents, currency: "eur" });
const NO_SESSION = reply({ detail: "Invalid or missing session" }, 401);

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  // reset() també avorta la consulta pendent i invalida les respostes tardanes d'un test anterior.
  useWalletStore.getState().reset();
  useWalletStore.setState(useWalletStore.getInitialState(), true);
  useOpportunityStore.setState(useOpportunityStore.getInitialState(), true);
  useInvestmentStore.setState(useInvestmentStore.getInitialState(), true);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const renderApp = (path: string) => {
  render(<MemoryRouter initialEntries={[path]}><SessionManager /><App /></MemoryRouter>);
  return { user: userEvent.setup({ delay: null }), nav: screen.getByRole("navigation", { name: "Navegación principal" }) };
};
// Text dins la targeta «Saldo disponible»; espera que la pàgina i la resposta hi siguin.
const findInBalance = async (text: string) =>
  within(await screen.findByRole("region", { name: "Saldo disponible" })).findByText(text);
const loginHeading = () => screen.findByRole("heading", { level: 1, name: "Iniciar sesión" });
const logIn = async (user: ReturnType<typeof userEvent.setup>, email: string) => {
  await user.type(screen.getByLabelText("Correo electrónico"), email);
  await user.type(screen.getByLabelText("Contraseña"), "Password1");
  await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
  // Fins que no s'arriba a l'inici, la redirecció del login encara podria desfer una altra navegació.
  await screen.findByRole("heading", { level: 1, name: /Encuentra tu próxima/ });
};

describe("Rutes privades: GET /api/auth/me decideix qui hi entra", () => {
  it("en recarregar /my-balance amb una cookie vàlida espera la sessió i només llavors demana el saldo", async () => {
    const me = deferred();
    serve({ "GET /api/auth/me": me.handler, "GET /api/me/wallet": reply(wallet(123_456, 10_000)) });
    const { nav } = renderApp("/my-balance");

    // Mentre no se sap si hi ha sessió: ni login ni cap dada privada.
    expect(screen.getByRole("status")).toHaveTextContent("Comprobando la sesión…");
    expect(screen.queryByRole("form", { name: "Iniciar sesión" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Mi saldo" })).not.toBeInTheDocument();
    expect(requests()).toEqual(["GET /api/auth/me"]);
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.credentials).toBe("include");
    expect(init?.body).toBeUndefined();
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);

    await me.resolve(json(account()));
    expect(await findInBalance("1.234,56 €")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Mi saldo" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Cerrar sesión" })).toBeEnabled();
    expect(screen.queryByText("Comprobando la sesión…")).not.toBeInTheDocument();
    expect(requests()).toEqual(["GET /api/auth/me", "GET /api/me/wallet"]);
    expect(fetchMock.mock.calls[1][1]?.credentials).toBe("include");
  });

  it.each([
    "/my-balance", "/my-balance/deposit", "/my-balance/withdraw", "/my-investments",
    "/my-opportunities", "/my-opportunities/new/real-estate", "/my-opportunities/new/equity",
  ])("un visitant a %s acaba al login sense demanar cap dada privada", async (path) => {
    serve({ "GET /api/auth/me": NO_SESSION });
    const { nav } = renderApp(path);

    expect(await loginHeading()).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Registrarse" })).toBeInTheDocument();
    expect(within(nav).queryByRole("button", { name: "Cerrar sesión" })).not.toBeInTheDocument();
    expect(requests()).toEqual(["GET /api/auth/me"]);
  });

  it("si la comprovació de sessió falla per xarxa, una ruta privada no s'obre", async () => {
    serve({ "GET /api/auth/me": () => Promise.reject(new TypeError("Failed to fetch")) });
    renderApp("/my-balance");

    expect(await loginHeading()).toBeInTheDocument();
    expect(requests()).toEqual(["GET /api/auth/me"]);
  });

  it("si la comprovació de sessió falla per xarxa, el visitant continua a la pàgina pública sense cap error", async () => {
    serve({ "GET /api/auth/me": () => Promise.reject(new TypeError("Failed to fetch")) });
    renderApp("/");

    // «Crear cuenta» només surt quan la comprovació ha acabat i no hi ha sessió.
    expect(await screen.findByRole("link", { name: "Crear cuenta" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: /Encuentra tu próxima/ })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(requests()).toEqual(["GET /api/auth/me"]);
  });

  it("amb una cookie vàlida, /login porta a l'inici sense tornar a demanar les credencials", async () => {
    serve({ "GET /api/auth/me": reply(account()) });
    const { nav } = renderApp("/login");

    // La redirecció arriba un render després que la capçalera reconegui la sessió.
    expect(await screen.findByRole("heading", { level: 1, name: /Encuentra tu próxima/ })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Iniciar sesión" })).not.toBeInTheDocument();
    expect(requests()).toEqual(["GET /api/auth/me"]);
  });
});

describe("Rutes d'entitat promotora: is_promoter de /api/auth/me", () => {
  it.each(["/my-opportunities", "/my-opportunities/new/real-estate", "/my-opportunities/new/equity"])(
    "un compte sense entitat promotora veu l'avís a %s i no es demana cap dada de promotor",
    async (path) => {
      serve({ "GET /api/auth/me": reply(account({ is_promoter: false })) });
      const { nav } = renderApp(path);

      expect(await screen.findByRole("heading", { level: 1, name: "Sección solo para entidades promotoras" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");
      expect(within(nav).getByRole("link", { name: "Mi saldo" })).toBeInTheDocument();
      expect(within(nav).queryByRole("link", { name: "Mis oportunidades" })).not.toBeInTheDocument();
      expect(requests()).toEqual(["GET /api/auth/me"]);
    },
  );

  it("un compte amb entitat promotora entra a «Mis oportunidades» i la pàgina demana les seves dades", async () => {
    serve({
      "GET /api/auth/me": reply(account({ id: 2, is_promoter: true })),
      // PromoterOpportunitiesRead i list[PromotingEntityRead] d'una entitat sense oportunitats.
      "GET /api/me/opportunities": reply({
        summary: { committed_cents: 0, published_count: 0, in_funding_count: 0, pending_review_count: 0 },
        opportunities: [],
      }),
      "GET /api/promotingentity": reply([{
        user_id: 2, legal_name: "Promociones Ejemplo SL", image_url: null, published_projects_count: 0,
        experience_years: null, founding_year: null, location: null,
      }]),
    });
    const { nav } = renderApp("/my-opportunities");

    expect(await screen.findByRole("heading", { level: 1, name: "Mis oportunidades" })).toBeInTheDocument();
    expect(await screen.findByText("Aún no has publicado ninguna oportunidad")).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Mis oportunidades" })).toHaveAttribute("href", "/my-opportunities");
    expect(screen.queryByText("Sección solo para entidades promotoras")).not.toBeInTheDocument();
    expect(requests()).toHaveLength(3);
    expect(requests()).toEqual(expect.arrayContaining(["GET /api/auth/me", "GET /api/me/opportunities", "GET /api/promotingentity"]));
  });
});

describe("Sessió caducada: un 401 d'una petició protegida", () => {
  it("si el saldo respon 401 en entrar, neteja la sessió i porta al login sense cridar logout", async () => {
    serve({ "GET /api/auth/me": reply(account()), "GET /api/me/wallet": NO_SESSION });
    const { nav } = renderApp("/my-balance");

    expect(await loginHeading()).toBeInTheDocument();
    expect(useAuthStore.getState().active_account).toBeNull();
    expect(within(nav).getByRole("link", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Mi saldo" })).not.toBeInTheDocument();
    // Ni saldo ni l'error genèric de la pàgina que s'ha abandonat.
    expect(screen.queryAllByText(/€/)).toHaveLength(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(requests()).toEqual(["GET /api/auth/me", "GET /api/me/wallet"]);
  });

  it("si la sessió caduca mentre es navega, el saldo que es veia desapareix i s'acaba al login", async () => {
    serve({
      "GET /api/auth/me": reply(account()),
      "GET /api/me/wallet": inOrder(reply(wallet(25_000, 5_000)), NO_SESSION),
    });
    const { user, nav } = renderApp("/my-balance");
    expect(await findInBalance("250,00 €")).toBeInTheDocument();

    // «Retirar fondos» torna a llegir el saldo: aquesta lectura ja troba la sessió caducada.
    await user.click(screen.getByRole("link", { name: "Retirar fondos" }));

    expect(await loginHeading()).toBeInTheDocument();
    expect(useAuthStore.getState().active_account).toBeNull();
    expect(within(nav).getByRole("link", { name: "Registrarse" })).toBeInTheDocument();
    expect(within(nav).queryByRole("button", { name: "Cerrar sesión" })).not.toBeInTheDocument();
    expect(screen.queryAllByText(/€/)).toHaveLength(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(requests()).toEqual(["GET /api/auth/me", "GET /api/me/wallet", "GET /api/me/wallet"]);
  });
});

describe("Canvi de compte: cap dada de saldo del compte anterior (US04.1)", () => {
  it("en tancar sessió desapareix el saldo, i el compte següent només veu el seu", async () => {
    const secondBalance = deferred();
    serve({
      "GET /api/auth/me": reply(account()),
      "GET /api/me/wallet": inOrder(reply(wallet(25_000, 5_000)), secondBalance.handler),
      "POST /api/auth/logout": () => Promise.resolve(new Response(null, { status: 204 })),
      "POST /api/auth/login": reply(account({ id: 2, email: "grace@example.com" })),
    });
    const { user, nav } = renderApp("/my-balance");
    expect(await findInBalance("250,00 €")).toBeInTheDocument();

    await user.click(within(nav).getByRole("button", { name: "Cerrar sesión" }));
    expect(await loginHeading()).toBeInTheDocument();
    expect(screen.queryAllByText(/€/)).toHaveLength(0);
    // Tampoc queda a la memòria del store, d'on el podria llegir una altra pantalla.
    await waitFor(() => expect(useWalletStore.getState().balance).toBeNull());

    await logIn(user, "grace@example.com");
    await user.click(within(nav).getByRole("link", { name: "Mi saldo" }));
    // Mentre arriba el saldo del compte nou no es mostra cap import, tampoc l'anterior.
    expect(await findInBalance("Cargando saldo…")).toBeInTheDocument();
    expect(screen.queryAllByText(/€/)).toHaveLength(0);

    await secondBalance.resolve(json(wallet(700, 300)));
    expect(await findInBalance("7,00 €")).toBeInTheDocument();
    expect(screen.queryByText("250,00 €")).not.toBeInTheDocument();
    expect(screen.queryByText("50,00 €")).not.toBeInTheDocument();
    expect(requests()).toEqual([
      "GET /api/auth/me", "GET /api/me/wallet", "POST /api/auth/logout", "POST /api/auth/login", "GET /api/me/wallet",
    ]);
  });

  it("una resposta de saldo del compte anterior que arriba tard no es mostra al compte nou", async () => {
    const firstBalance = deferred();
    const secondBalance = deferred();
    serve({
      "GET /api/auth/me": reply(account()),
      "GET /api/me/wallet": inOrder(firstBalance.handler, secondBalance.handler),
      "POST /api/auth/logout": () => Promise.resolve(new Response(null, { status: 204 })),
      "POST /api/auth/login": reply(account({ id: 2, email: "grace@example.com" })),
    });
    const { user, nav } = renderApp("/my-balance");
    expect(await findInBalance("Cargando saldo…")).toBeInTheDocument();

    // El primer compte tanca la sessió abans que arribi el seu saldo.
    await user.click(within(nav).getByRole("button", { name: "Cerrar sesión" }));
    expect(await loginHeading()).toBeInTheDocument();
    await logIn(user, "grace@example.com");
    await user.click(within(nav).getByRole("link", { name: "Mi saldo" }));
    expect(await findInBalance("Cargando saldo…")).toBeInTheDocument();

    await firstBalance.resolve(json(wallet(25_000, 5_000)));
    expect(await findInBalance("Cargando saldo…")).toBeInTheDocument();
    expect(screen.queryAllByText(/€/)).toHaveLength(0);

    await secondBalance.resolve(json(wallet(700, 300)));
    expect(await findInBalance("7,00 €")).toBeInTheDocument();
    expect(screen.queryByText("250,00 €")).not.toBeInTheDocument();
  });
});
