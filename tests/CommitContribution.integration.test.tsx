import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SessionManager from "../src/components/SessionManager";
import RealEstateDetail from "../src/pages/opportunities/real-estate/RealEstateDetail";
import { useAuthStore } from "../src/store/useAuthStore";
import { useOpportunityStore } from "../src/store/useOpportunityStore";
import { useWalletStore } from "../src/store/useWalletStore";

// Detall immobiliari, diàleg d'aportació, stores i src/service/api.ts reals: només se simula fetch.
const fetchMock = vi.fn<typeof fetch>();

const DETAIL = "GET /api/opportunities/7";
const WALLET = "GET /api/me/wallet";
const COMMIT = "POST /api/opportunities/7/commitments";

const DAY_MS = 86_400_000;

// UserRead (backend: app/schemas/auth.py).
const account = {
  id: 1,
  email: "ada@example.com",
  first_name: "Ada",
  last_name: "Lovelace",
  phone: "+34612345678",
  created_at: "2026-11-09T12:00:00Z",
  is_promoter: false,
};

// BalanceRead (backend: app/schemas/wallet.py).
const wallet = (available_cents: number, committed_cents = 0) => ({ available_cents, committed_cents, currency: "eur" });

// RealEstateOpportunityDetailRead (backend: app/schemas/opportunity.py). Falten 27.000,00 € per
// arribar a l'objectiu. Les dates es calculen en cridar la funció perquè el termini mai venci.
const realEstateDetail = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  type: "real_estate",
  status: "published",
  title: "Piso en Girona",
  description: "Primer párrafo.\n\nSegundo párrafo.",
  location: "Girona, Girona, España",
  cover_image_url: null,
  images: [],
  target_amount_cents: 7_200_000,
  committed_cents: 4_500_000,
  minimum_contribution_cents: 10_000,
  deadline: new Date(Date.now() + 30 * DAY_MS).toISOString(),
  date_published: new Date(Date.now() - 30 * DAY_MS).toISOString(),
  promoter: {
    user_id: 10,
    legal_name: "Promociones Girona SL",
    image_url: null,
    published_projects_count: 3,
    experience_years: 8,
    founding_year: 2018,
    location: "Girona, Girona, España",
  },
  real_estate: {
    purpose: "acquisition_and_renovation",
    intended_use: "rental",
    asset_type: "residential",
    surface_m2: "950.50",
    planned_housing_units: 12,
    estimated_works_end: null,
    estimated_rental_start: null,
    public_latitude: "41.981800",
    public_longitude: "2.823700",
  },
  server_time: new Date().toISOString(),
  ...overrides,
});

// CommitmentResultRead (backend: app/schemas/commitment.py), que la ruta retorna amb un 201.
// Una aportació immobiliària no té participació estimada.
const committed = (amount_cents: number, committed_cents: number, balance: ReturnType<typeof wallet>) => ({
  commitment: {
    id: 31,
    opportunity_id: 7,
    amount_cents,
    created_at: new Date().toISOString(),
    estimated_equity: null,
  },
  opportunity: { id: 7, target_amount_cents: 7_200_000, committed_cents },
  wallet: balance,
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

type Reply = () => Response | Promise<Response>;

// Respostes per «MÈTODE ruta». Una petició que la prova no espera es rebutja i, a més, queda a
// la llista de `requests()`, que cada prova compara amb les peticions que havia de fer.
const serve = (routes: Record<string, Reply>) => {
  fetchMock.mockImplementation(async (url, init) => {
    const reply = routes[`${init?.method} ${String(url)}`];
    if (!reply) throw new Error(`Petició inesperada: ${init?.method} ${String(url)}`);
    return reply();
  });
};

const requests = () => fetchMock.mock.calls.map(([url, init]) => `${init?.method} ${String(url)}`);
const commitRequests = () => fetchMock.mock.calls.filter(([url, init]) => `${init?.method} ${String(url)}` === COMMIT);
const commitBodies = () => commitRequests().map(([, init]) => JSON.parse(String(init?.body)) as unknown);

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  useOpportunityStore.setState(useOpportunityStore.getInitialState(), true);
  // reset() també cancel·la la consulta de saldo pendent, que setState no coneix.
  useWalletStore.getState().reset();
  useWalletStore.setState(useWalletStore.getInitialState(), true);
  useAuthStore.setState({ active_account: account, status: "success", sessionChecked: true });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

const page = ({ withSession = false } = {}) => render(
  <MemoryRouter initialEntries={["/opportunities/real-estate/7"]}>
    {withSession && <SessionManager />}
    <Routes>
      <Route path="/opportunities/real-estate/:id" element={<RealEstateDetail />} />
      <Route path="/my-balance" element={<h1>Saldo simulado</h1>} />
      <Route path="/my-balance/deposit" element={<h1>Ingreso simulado</h1>} />
      <Route path="/login" element={<h1>Inicio de sesión simulado</h1>} />
    </Routes>
  </MemoryRouter>,
);

type User = ReturnType<typeof userEvent.setup>;

const openDialog = async (user: User) => {
  await user.click(await screen.findByRole("button", { name: "Quiero invertir" }));
  return screen.findByRole("dialog", { name: "Comprometer aportación" });
};

// Obre el diàleg, espera el saldo, escriu l'import i arriba a la confirmació.
const openConfirmation = async (user: User, amount = "100") => {
  const dialog = await openDialog(user);
  await within(dialog).findByText("250,00 €");
  await user.type(within(dialog).getByRole("textbox", { name: /Importe de la aportación/ }), amount);
  await user.click(within(dialog).getByRole("button", { name: "Continuar" }));
  return screen.findByRole("dialog", { name: "Confirma tu aportación" });
};

const acceptAndConfirm = async (user: User, dialog: HTMLElement) => {
  await user.click(within(dialog).getByRole("checkbox", { name: /Entiendo que la inversión conlleva riesgos/ }));
  await user.click(within(dialog).getByRole("button", { name: "Confirmar aportación" }));
};

describe("Aportación inmobiliaria: integración de detalle, diálogo, stores y API", () => {
  it("compromete 100,00 € con un solo POST y actualiza el detalle y el saldo con la respuesta", async () => {
    let finish!: (response: Response) => void;
    let balance = wallet(25_000);
    serve({
      [DETAIL]: () => json(realEstateDetail()),
      [WALLET]: () => json(balance),
      [COMMIT]: () => new Promise<Response>((resolve) => { finish = resolve; }),
    });
    const user = userEvent.setup({ delay: null });

    page();
    const amountDialog = await openDialog(user);

    // El saldo es llegeix en obrir el diàleg; el mínim i el pendent surten del detall.
    expect(await within(amountDialog).findByText("250,00 €")).toBeInTheDocument();
    expect(within(amountDialog).getByText("Aportación mínima").parentElement).toHaveTextContent("100,00 €");
    expect(within(amountDialog).getByText("Pendiente").parentElement).toHaveTextContent("27.000,00 €");
    expect(fetchMock).toHaveBeenCalledWith("/api/me/wallet", expect.objectContaining({ method: "GET", credentials: "include" }));

    await user.type(within(amountDialog).getByRole("textbox", { name: /Importe de la aportación/ }), "100");
    await user.click(within(amountDialog).getByRole("button", { name: "Continuar" }));
    const dialog = await screen.findByRole("dialog", { name: "Confirma tu aportación" });
    expect(within(dialog).getByText("Saldo disponible tras la aportación").parentElement).toHaveTextContent("150,00 €");

    // Sense acceptar els riscos no es pot confirmar, i encara no s'ha enviat res.
    const confirm = within(dialog).getByRole("button", { name: "Confirmar aportación" });
    expect(confirm).toBeDisabled();
    expect(commitRequests()).toHaveLength(0);
    await user.click(within(dialog).getByRole("checkbox", { name: /Entiendo que la inversión conlleva riesgos/ }));
    await user.dblClick(confirm);

    // Mentre el backend no respon: una sola petició i cap manera de repetir-la ni de sortir.
    expect(commitRequests()).toHaveLength(1);
    expect(within(dialog).getByRole("button", { name: "Confirmando…" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Volver" })).toBeDisabled();
    expect(within(dialog).getByRole("checkbox")).toBeDisabled();
    expect(within(dialog).queryByRole("button", { name: "Cerrar diálogo" })).not.toBeInTheDocument();

    const [url, init] = commitRequests()[0];
    expect(url).toBe("/api/opportunities/7/commitments");
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("include");
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
    // CommitmentCreate: cèntims enters, sense cap altre camp.
    expect(commitBodies()).toEqual([{ amount_cents: 10_000 }]);

    balance = wallet(15_000, 10_000);
    await act(async () => finish(json(committed(10_000, 4_510_000, balance), 201)));

    const done = await screen.findByRole("dialog", { name: "Aportación comprometida" });
    expect(within(done).getByRole("status")).toHaveTextContent(
      "Has comprometido 100,00 € en esta oportunidad. Tu saldo disponible ahora es de 150,00 €.",
    );
    expect(commitRequests()).toHaveLength(1);

    // El detall mostra el capital nou amb la resposta del compromís, sense tornar-lo a demanar.
    await user.click(within(done).getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("45.100,00 €")).toBeInTheDocument();
    expect(screen.getByText("62,6 % del objetivo")).toBeInTheDocument();
    expect(requests()).toEqual([DETAIL, WALLET, COMMIT]);

    // Una aportació nova parteix del saldo i del pendent actualitzats.
    const reopened = await openDialog(user);
    expect(await within(reopened).findByText("150,00 €")).toBeInTheDocument();
    expect(within(reopened).getByText("Pendiente").parentElement).toHaveTextContent("26.900,00 €");
    expect(requests()).toEqual([DETAIL, WALLET, COMMIT, WALLET]);
  });

  it("desde la confirmación correcta, «Ver mi saldo» lleva a «Mi saldo»", async () => {
    serve({
      [DETAIL]: () => json(realEstateDetail()),
      [WALLET]: () => json(wallet(25_000)),
      [COMMIT]: () => json(committed(10_000, 4_510_000, wallet(15_000, 10_000)), 201),
    });
    const user = userEvent.setup({ delay: null });

    page();
    await acceptAndConfirm(user, await openConfirmation(user));
    const done = await screen.findByRole("dialog", { name: "Aportación comprometida" });
    await user.click(within(done).getByRole("button", { name: "Ver mi saldo" }));

    expect(await screen.findByRole("heading", { name: "Saldo simulado" })).toBeInTheDocument();
    expect(requests()).toEqual([DETAIL, WALLET, COMMIT]);
  });

  it("un 409 «ya no admite esta aportación» bloquea el diálogo sin cambiar nada y al cerrarlo vuelve a leer la oportunidad", async () => {
    // Mentre l'usuari confirmava, una altra persona ha deixat només 50,00 € pendents.
    let detail = realEstateDetail();
    serve({
      [DETAIL]: () => json(detail),
      [WALLET]: () => json(wallet(25_000)),
      [COMMIT]: () => json({ detail: "Opportunity no longer accepts this contribution" }, 409),
    });
    const user = userEvent.setup({ delay: null });

    page();
    const dialog = await openConfirmation(user);
    await acceptAndConfirm(user, dialog);

    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent("Esta oportunidad ya no admite esta aportación.");
    expect(alert).toHaveTextContent("Cierra este diálogo para ver la oportunidad actualizada.");
    expect(within(alert).queryByRole("link", { name: "Ingresar fondos" })).not.toBeInTheDocument();
    // Tornar a confirmar o tornar enrere no ho resol: només es pot tancar.
    expect(within(dialog).getByRole("button", { name: "Confirmar aportación" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Volver" })).toBeDisabled();
    expect(screen.queryByRole("dialog", { name: "Aportación comprometida" })).not.toBeInTheDocument();
    // Ni el capital del detall ni el saldo del store han canviat amb l'intent fallit.
    expect(screen.getByText("45.000,00 €")).toBeInTheDocument();
    expect(screen.getByText("62,5 % del objetivo")).toBeInTheDocument();
    expect(useWalletStore.getState().balance).toEqual(wallet(25_000));
    expect(requests()).toEqual([DETAIL, WALLET, COMMIT]);

    detail = realEstateDetail({ committed_cents: 7_195_000 });
    await user.click(within(dialog).getByRole("button", { name: "Cerrar diálogo" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByText("71.950,00 €")).toBeInTheDocument();
    expect(screen.getByText("99,9 % del objetivo")).toBeInTheDocument();
    expect(requests()).toEqual([DETAIL, WALLET, COMMIT, DETAIL]);

    // El saldo segueix sencer i el diàleg nou valida amb el pendent actual.
    const reopened = await openDialog(user);
    expect(await within(reopened).findByText("250,00 €")).toBeInTheDocument();
    expect(within(reopened).getByText("Pendiente").parentElement).toHaveTextContent("50,00 €");
    expect(commitRequests()).toHaveLength(1);
  });

  it.each([
    {
      name: "un 409 por saldo insuficiente",
      status: 409,
      detail: "Insufficient funds",
      message: "No tienes saldo suficiente para esta aportación.",
      offersDeposit: true,
    },
    {
      name: "un 404 porque la oportunidad ya no es pública",
      status: 404,
      detail: "Opportunity not available",
      message: "Esta oportunidad ya no está disponible.",
      offersDeposit: false,
    },
  ])("$name bloquea el diálogo con su mensaje y al cerrarlo vuelve a leer la oportunidad", async ({ status, detail, message, offersDeposit }) => {
    serve({
      [DETAIL]: () => json(realEstateDetail()),
      [WALLET]: () => json(wallet(25_000)),
      [COMMIT]: () => json({ detail }, status),
    });
    const user = userEvent.setup({ delay: null });

    page();
    const dialog = await openConfirmation(user);
    await acceptAndConfirm(user, dialog);

    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent(message);
    expect(alert).toHaveTextContent("Cierra este diálogo para ver la oportunidad actualizada.");
    const deposit = within(alert).queryByRole("link", { name: "Ingresar fondos" });
    if (offersDeposit) expect(deposit).toHaveAttribute("href", "/my-balance/deposit");
    else expect(deposit).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Confirmar aportación" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Volver" })).toBeDisabled();

    await user.click(within(dialog).getByRole("button", { name: "Cerrar diálogo" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("45.000,00 €")).toBeInTheDocument();
    expect(requests()).toEqual([DETAIL, WALLET, COMMIT, DETAIL]);
  });

  it("un 422 por debajo del mínimo vuelve al importe con el error bajo el campo, lo conserva y permite corregirlo", async () => {
    // El mínim ha pujat a 200,00 € al backend després d'obrir el diàleg.
    let detail = realEstateDetail();
    let rejects = true;
    serve({
      [DETAIL]: () => json(detail),
      [WALLET]: () => json(wallet(25_000)),
      [COMMIT]: () => rejects
        ? json({ detail: "Amount below the minimum contribution" }, 422)
        : json(committed(20_000, 4_520_000, wallet(5_000, 20_000)), 201),
    });
    const user = userEvent.setup({ delay: null });

    page();
    const confirmation = await openConfirmation(user);
    detail = realEstateDetail({ minimum_contribution_cents: 20_000 });
    await acceptAndConfirm(user, confirmation);

    const dialog = await screen.findByRole("dialog", { name: "Comprometer aportación" });
    const field = within(dialog).getByRole("textbox", { name: /Importe de la aportación/ });
    expect(field).toHaveValue("100,00");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(expect.stringContaining("El importe es inferior a la aportación mínima."));
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    // El detall es torna a llegir perquè la validació faci servir el mínim vigent.
    expect(await within(dialog).findByText("200,00 €")).toBeInTheDocument();
    expect(requests()).toEqual([DETAIL, WALLET, COMMIT, DETAIL]);

    rejects = false;
    await user.clear(field);
    await user.type(field, "200");
    await user.click(within(dialog).getByRole("button", { name: "Continuar" }));
    await acceptAndConfirm(user, await screen.findByRole("dialog", { name: "Confirma tu aportación" }));

    expect(await screen.findByRole("dialog", { name: "Aportación comprometida" })).toHaveTextContent("200,00 €");
    expect(commitBodies()).toEqual([{ amount_cents: 10_000 }, { amount_cents: 20_000 }]);
  });

  it.each([
    ["un 500 del servidor", () => json({ detail: "Internal Server Error" }, 500)],
    ["un error de red", () => Promise.reject(new TypeError("Failed to fetch"))],
  ])("tras %s mantiene la confirmación y la misma aportación se puede volver a confirmar", async (_name, failure) => {
    let fails = true;
    serve({
      [DETAIL]: () => json(realEstateDetail()),
      [WALLET]: () => json(wallet(25_000)),
      [COMMIT]: () => fails ? failure() : json(committed(10_000, 4_510_000, wallet(15_000, 10_000)), 201),
    });
    const user = userEvent.setup({ delay: null });

    page();
    const dialog = await openConfirmation(user);
    await acceptAndConfirm(user, dialog);

    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent("No se ha podido comprometer la aportación. Inténtalo de nuevo.");
    expect(alert).not.toHaveTextContent("Cierra este diálogo");
    // L'usuari no ha de tornar a escriure res ni a acceptar els riscos.
    expect(within(dialog).getByText("Aportación").parentElement).toHaveTextContent("100,00 €");
    expect(within(dialog).getByRole("checkbox")).toBeChecked();
    const confirm = within(dialog).getByRole("button", { name: "Confirmar aportación" });
    expect(confirm).toBeEnabled();
    expect(within(dialog).getByRole("button", { name: "Volver" })).toBeEnabled();
    expect(screen.getByText("45.000,00 €")).toBeInTheDocument();

    fails = false;
    await user.click(confirm);

    expect(await screen.findByRole("dialog", { name: "Aportación comprometida" })).toHaveTextContent("150,00 €");
    expect(commitBodies()).toEqual([{ amount_cents: 10_000 }, { amount_cents: 10_000 }]);
    expect(requests()).toEqual([DETAIL, WALLET, COMMIT, COMMIT]);
  });

  it("si no se puede leer el saldo no deja continuar y «Reintentar» lo vuelve a pedir", async () => {
    let fails = true;
    serve({
      [DETAIL]: () => json(realEstateDetail()),
      [WALLET]: () => fails ? json({ detail: "Internal Server Error" }, 500) : json(wallet(25_000)),
    });
    const user = userEvent.setup({ delay: null });

    page();
    const dialog = await openDialog(user);

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("No se ha podido consultar tu saldo.");
    expect(within(dialog).getByText("Saldo disponible").parentElement).toHaveTextContent("No disponible");
    expect(within(dialog).getByRole("button", { name: "Continuar" })).toBeDisabled();
    await user.type(within(dialog).getByRole("textbox", { name: /Importe de la aportación/ }), "100");

    fails = false;
    await user.click(within(dialog).getByRole("button", { name: "Reintentar" }));

    expect(await within(dialog).findByText("250,00 €")).toBeInTheDocument();
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    // L'import escrit mentre fallava el saldo es conserva (el camp completa els decimals en sortir-ne).
    expect(within(dialog).getByRole("textbox", { name: /Importe de la aportación/ })).toHaveValue("100,00");
    expect(within(dialog).getByRole("button", { name: "Continuar" })).toBeEnabled();
    expect(requests()).toEqual([DETAIL, WALLET, WALLET]);
  });

  it("con la sesión caducada al confirmar acaba en el inicio de sesión sin mensaje de error", async () => {
    serve({
      // Comprovació inicial de SessionManager: la cookie encara era vàlida en carregar.
      "GET /api/auth/me": () => json(account),
      [DETAIL]: () => json(realEstateDetail()),
      [WALLET]: () => json(wallet(25_000)),
      [COMMIT]: () => json({ detail: "Invalid or missing session" }, 401),
    });
    const user = userEvent.setup({ delay: null });

    page({ withSession: true });
    await acceptAndConfirm(user, await openConfirmation(user));

    expect(await screen.findByRole("heading", { name: "Inicio de sesión simulado" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(useAuthStore.getState().active_account).toBeNull();
    expect(commitRequests()).toHaveLength(1);
  });
});
