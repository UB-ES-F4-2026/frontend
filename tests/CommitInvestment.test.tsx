import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BusinessDetail from "../src/pages/opportunities/business/BusinessDetail";
import MyWalletPage from "../src/pages/wallet/MyWalletPage";
import { ApiError, fintechGet, fintechPost } from "../src/service/api";
import { useAuthStore } from "../src/store/useAuthStore";
import { useOpportunityStore, type BusinessOpportunityGetResponse } from "../src/store/useOpportunityStore";
import { useWalletStore } from "../src/store/useWalletStore";

// Pàgines i stores reals; només simulem les crides a l'API.
vi.mock("../src/service/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/service/api")>(),
  fintechGet: vi.fn(),
  fintechPost: vi.fn(),
}));

const get = vi.mocked(fintechGet);
const post = vi.mocked(fintechPost);

// Intl separa el número i el símbol (€ o %) amb un espai no separable (U+00A0). El text visible
// (getByText, toHaveTextContent) el normalitza a un espai; la descripció accessible, no.
const nbsp = (text: string) => text.replace(/ (€|%)/g, " $1");

// Escenari dels mockups: 184.500,00 € compromesos d'un objectiu de 300.000,00 €, valoració prèvia
// de 2.700.000,00 €, aportació mínima de 250,00 € i 1.500,00 € disponibles.
const buildDetail = (overrides: Partial<BusinessOpportunityGetResponse> = {}): BusinessOpportunityGetResponse => ({
  id: 44,
  type: "equity",
  status: "published",
  title: "Expansión de BioPack: envases compostables",
  description: "BioPack busca financiación para ampliar su línea de envases compostables.",
  location: "Sabadell, Barcelona, España",
  cover_image_url: null,
  target_amount_cents: 300_000_00,
  committed_cents: 184_500_00,
  minimum_contribution_cents: 250_00,
  date_published: "2026-11-02T09:00:00.000Z",
  deadline: "2099-12-15T22:59:00.000Z",
  server_time: "2026-11-22T12:00:00.000Z",
  promoter: {
    user_id: 10,
    legal_name: "BioPack Solutions SL",
    image_url: null,
    published_projects_count: 2,
    experience_years: 6,
    location: "Sabadell, Barcelona, España",
  },
  business: {
    sector: "energy",
    phase: "growth",
    pre_investment_valuation_cents: 2_700_000_00,
    equity_offered: "10.00000000000000000000000000",
  },
  ...overrides,
});

// Backend simulat: el detall de l'oportunitat i el saldo del client. Un compromís correcte mou
// l'import del disponible al compromès i el suma al capital de l'oportunitat, com el backend.
let api: {
  detail: BusinessOpportunityGetResponse;
  wallet: { available_cents: number; committed_cents: number; currency: "eur" };
  // Simula que l'oportunitat ha deixat d'estar en finançament (p. ex. ha vençut).
  closed: boolean;
};

const renderDetail = () =>
  render(
    <MemoryRouter initialEntries={["/opportunities/equity/44"]}>
      <Routes>
        <Route path="/opportunities/equity/:id" element={<BusinessDetail />} />
        <Route path="/my-balance" element={<MyWalletPage />} />
      </Routes>
    </MemoryRouter>,
  );

const user = () => userEvent.setup({ delay: null });

// Obre el diàleg des del detall i espera que el saldo estigui carregat.
const openDialog = async (u = user()) => {
  renderDetail();
  await u.click(await screen.findByRole("button", { name: "Quiero invertir" }));
  const dialog = await screen.findByRole("dialog", { name: "Comprometer inversión" });
  await within(dialog).findByText("1.500,00 €");
  return dialog;
};

const amountField = () => screen.getByRole("textbox", { name: /Importe de la inversión/ });
const continueButton = () => screen.getByRole("button", { name: "Continuar" });
// Valor que acompanya una etiqueta d'una llista de resum (<dt>/<dd>).
const valueOf = (container: HTMLElement, label: string) =>
  within(container).getByText(label, { selector: "dt" }).nextElementSibling;
const capital = () => screen.getByText("Capital comprometido").nextElementSibling;

const goToConfirmation = async (u: ReturnType<typeof user>, amount = "1000") => {
  await u.type(amountField(), amount);
  await u.click(continueButton());
  return screen.findByRole("dialog", { name: "Confirma tu inversión" });
};

const confirmInvestment = async (u: ReturnType<typeof user>, confirmation: HTMLElement) => {
  await u.click(within(confirmation).getByRole("checkbox"));
  await u.click(within(confirmation).getByRole("button", { name: "Confirmar inversión" }));
};

beforeEach(() => {
  vi.resetAllMocks();
  api = { detail: buildDetail(), wallet: { available_cents: 1_500_00, committed_cents: 0, currency: "eur" }, closed: false };
  get.mockImplementation(async (path: string) => {
    if (path === "/me/wallet") return { ...api.wallet };
    if (path === "/opportunities/44") return { ...api.detail };
    throw new ApiError("Not found", 404, null);
  });
  post.mockImplementation(async (path: string, body: unknown) => {
    if (path !== "/opportunities/44/commitments") throw new ApiError("Not found", 404, null);
    const amount = (body as { amount_cents: number }).amount_cents;
    const { detail, wallet } = api;
    const remaining = detail.target_amount_cents - detail.committed_cents;
    if (api.closed || remaining <= 0 || amount > remaining) {
      throw new ApiError("Opportunity no longer accepts this contribution", 409, null);
    }
    if (amount > wallet.available_cents) throw new ApiError("Insufficient funds", 409, null);
    api.detail = { ...detail, committed_cents: detail.committed_cents + amount };
    api.wallet = { ...wallet, available_cents: wallet.available_cents - amount, committed_cents: wallet.committed_cents + amount };
    return {
      commitment: {
        id: 1,
        opportunity_id: 44,
        amount_cents: amount,
        created_at: "2026-11-22T12:00:00Z",
        estimated_equity: String((amount / (2_700_000_00 + 300_000_00)) * 100),
      },
      opportunity: { id: 44, target_amount_cents: api.detail.target_amount_cents, committed_cents: api.detail.committed_cents },
      wallet: api.wallet,
    };
  });
  useAuthStore.setState({
    ...useAuthStore.getInitialState(),
    active_account: { id: 1, email: "user@example.com", created_at: "2026-10-27T10:00:00Z" },
  }, true);
  useOpportunityStore.setState(useOpportunityStore.getInitialState(), true);
  useWalletStore.getState().reset();
});

describe("1. Obrir el formulari d'inversió", () => {
  it("«Quiero invertir» obre «Comprometer inversión» amb el saldo, l'aportació mínima, el pendent i el camp d'import", async () => {
    const dialog = await openDialog();

    expect(within(dialog).getByText("Expansión de BioPack: envases compostables")).toBeInTheDocument();
    expect(valueOf(dialog, "Saldo disponible")).toHaveTextContent("1.500,00 €");
    expect(valueOf(dialog, "Aportación mínima")).toHaveTextContent("250,00 €");
    expect(valueOf(dialog, "Pendiente")).toHaveTextContent("115.500,00 €");
    expect(amountField()).toHaveAccessibleName("Importe de la inversión (€)");
    expect(amountField()).toHaveAccessibleDescription(
      nbsp("Entre 250,00 € y 115.500,00 €, sin superar tu saldo disponible."),
    );
  });
});

describe("2. Participació estimada", () => {
  it("amb 1.000,00 € mostra 0,033 % i s'actualitza cada vegada que canvia l'import", async () => {
    const u = user();
    const dialog = await openDialog(u);
    const equity = () => valueOf(dialog, "Participación estimada");
    expect(within(dialog).getByText("Si se alcanza el objetivo de financiación")).toBeInTheDocument();
    expect(equity()).toHaveTextContent("—");

    await u.type(amountField(), "1000");
    expect(equity()).toHaveTextContent("0,033 %");

    await u.clear(amountField());
    await u.type(amountField(), "2000");
    expect(equity()).toHaveTextContent("0,067 %");

    await u.clear(amountField());
    expect(equity()).toHaveTextContent("—");
  });

  it("una participació massa petita per a tres decimals no es mostra com a 0", async () => {
    const u = user();
    api.detail = buildDetail({ minimum_contribution_cents: null });
    const dialog = await openDialog(u);
    await u.type(amountField(), "1");
    expect(valueOf(dialog, "Participación estimada")).toHaveTextContent("< 0,001 %");
  });
});

describe("3. Validació de l'import", () => {
  it.each([
    ["inferior a l'aportació mínima", "100", "La aportación mínima es de 250,00 €."],
    ["superior al pendent", "120000", "El importe no puede superar los 115.500,00 € pendientes para alcanzar el objetivo."],
    ["amb més de dos decimals", "300,555", "El importe no puede tener más de dos decimales."],
    ["buit", "", "Introduce el importe de la inversión."],
  ])("amb un import %s no passa a la confirmació i mostra l'error sota el camp", async (_label, amount, message) => {
    const u = user();
    await openDialog(u);
    if (amount) await u.type(amountField(), amount);
    await u.click(continueButton());

    expect(amountField()).toHaveAttribute("aria-invalid", "true");
    expect(amountField()).toHaveAccessibleDescription(expect.stringContaining(nbsp(message)));
    expect(screen.queryByRole("dialog", { name: "Confirma tu inversión" })).not.toBeInTheDocument();
  });
});

describe("4. Saldo insuficient", () => {
  it("amb 1.500,00 € disponibles, 2.000,00 € no passa a la confirmació i ofereix «Ingresar fondos» (maqueta)", async () => {
    const u = user();
    const dialog = await openDialog(u);
    await u.type(amountField(), "2000");
    await u.click(continueButton());

    expect(within(dialog).getByText("No tienes saldo suficiente para esta inversión.")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Ingresar fondos" })).toHaveAttribute("href", "/my-balance/deposit");
    // L'error va abans de l'ajuda, que continua visible.
    expect(amountField()).toHaveAccessibleDescription(
      nbsp("No tienes saldo suficiente para esta inversión. Ingresar fondos Entre 250,00 € y 115.500,00 €, sin superar tu saldo disponible."),
    );
    expect(screen.queryByRole("dialog", { name: "Confirma tu inversión" })).not.toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });
});

describe("5. Confirmació de la inversió", () => {
  it("mostra la inversió, l'oportunitat, la valoració, la participació i el saldo que quedarà", async () => {
    const u = user();
    await openDialog(u);
    const confirmation = await goToConfirmation(u);

    expect(valueOf(confirmation, "Inversión")).toHaveTextContent("1.000,00 €");
    expect(valueOf(confirmation, "Oportunidad")).toHaveTextContent("Expansión de BioPack: envases compostables");
    expect(valueOf(confirmation, "Valoración previa a la inversión")).toHaveTextContent("2.700.000,00 €");
    expect(valueOf(confirmation, "Participación estimada")).toHaveTextContent("0,033 %");
    expect(valueOf(confirmation, "Saldo disponible tras la inversión")).toHaveTextContent("500,00 €");
    expect(post).not.toHaveBeenCalled();
  });

  it("«Confirmar inversión» només s'activa en acceptar els riscos d'invertir en una empresa", async () => {
    const u = user();
    await openDialog(u);
    const confirmation = await goToConfirmation(u);
    const confirm = within(confirmation).getByRole("button", { name: "Confirmar inversión" });
    const risks = within(confirmation).getByRole("checkbox", {
      name: "Entiendo que invertir en una empresa conlleva riesgos, incluida la pérdida total del capital, que la participación puede ser difícil de vender y que el importe quedará comprometido en esta oportunidad.",
    });

    expect(confirm).toBeDisabled();
    await u.click(risks);
    expect(confirm).toBeEnabled();
    await u.click(risks);
    expect(confirm).toBeDisabled();
  });

  it("«Volver» torna al pas de l'import amb l'import conservat", async () => {
    const u = user();
    await openDialog(u);
    const confirmation = await goToConfirmation(u);
    await u.click(within(confirmation).getByRole("button", { name: "Volver" }));

    expect(await screen.findByRole("dialog", { name: "Comprometer inversión" })).toBeInTheDocument();
    expect(amountField()).toHaveValue("1.000,00");
    expect(post).not.toHaveBeenCalled();
  });
});

describe("6. Inversió comprometida", () => {
  it("confirma 1.000,00 €, ho anuncia amb la participació i actualitza el detall i «Mi saldo»", async () => {
    const u = user();
    await openDialog(u);
    const confirmation = await goToConfirmation(u);
    await confirmInvestment(u, confirmation);

    expect(post).toHaveBeenCalledExactlyOnceWith("/opportunities/44/commitments", { amount_cents: 1_000_00 });
    const done = await screen.findByRole("dialog", { name: "Inversión comprometida" });
    expect(within(done).getByRole("status")).toHaveTextContent(
      "Has comprometido 1.000,00 € en esta oportunidad, que equivalen a una participación estimada del 0,033 %. Tu saldo disponible ahora es de 500,00 €.",
    );

    // El detall mostra el capital i el percentatge nous sense tornar-lo a llegir.
    await u.click(within(done).getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(capital()).toHaveTextContent("185.500,00 €");
    expect(screen.getByText("61,8 % del objetivo")).toBeInTheDocument();
    expect(get.mock.calls.filter(([path]) => path === "/opportunities/44")).toHaveLength(1);
  });

  it("«Ver mi saldo» mostra 500,00 € disponibles i 1.000,00 € compromesos", async () => {
    const u = user();
    await openDialog(u);
    await confirmInvestment(u, await goToConfirmation(u));
    const done = await screen.findByRole("dialog", { name: "Inversión comprometida" });
    await u.click(within(done).getByRole("button", { name: "Ver mi saldo" }));

    const balance = await screen.findByRole("region", { name: "Saldo disponible" });
    expect(await within(balance).findByText("500,00 €")).toBeInTheDocument();
    expect(within(balance).getByText("Saldo comprometido").nextElementSibling).toHaveTextContent("1.000,00 €");
  });

  it("bloqueja «Confirmar inversión» mentre es processa i no inverteix dues vegades", async () => {
    const u = user();
    let finish!: () => void;
    const original = post.getMockImplementation()!;
    post.mockImplementationOnce((...args) => new Promise((done) => { finish = () => done(original(...args)); }));
    await openDialog(u);
    const confirmation = await goToConfirmation(u);
    await confirmInvestment(u, confirmation);

    const processing = within(confirmation).getByRole("button", { name: "Confirmando…" });
    expect(processing).toBeDisabled();
    await u.click(processing);
    finish();
    expect(await screen.findByRole("dialog", { name: "Inversión comprometida" })).toBeInTheDocument();
    expect(post).toHaveBeenCalledOnce();
  });
});

describe("7. Objectiu assolit", () => {
  it("en invertir els 500,00 € que falten, el detall mostra «Financiación completada» i desactiva «Quiero invertir»", async () => {
    const u = user();
    api.detail = buildDetail({ committed_cents: 299_500_00 });
    await openDialog(u);
    await confirmInvestment(u, await goToConfirmation(u, "500"));
    const done = await screen.findByRole("dialog", { name: "Inversión comprometida" });
    await u.click(within(done).getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    expect(screen.getByText("Financiación completada")).toBeInTheDocument();
    expect(capital()).toHaveTextContent("300.000,00 €");
    expect(screen.getByRole("button", { name: "Quiero invertir" })).toBeDisabled();
  });
});

describe("8. L'oportunitat deixa d'admetre la inversió", () => {
  it.each([
    ["ha vençut", () => { api.closed = true; }],
    ["ha assolit l'objectiu", () => { api.detail = { ...api.detail, committed_cents: 300_000_00 }; }],
    ["ja no té prou import pendent", () => { api.detail = { ...api.detail, committed_cents: 299_500_00 }; }],
  ])("si mentrestant %s, ho indica i no canvia ni el saldo ni el capital", async (_label, change) => {
    const u = user();
    await openDialog(u);
    const confirmation = await goToConfirmation(u);
    const before = { ...api };
    change();
    await confirmInvestment(u, confirmation);

    expect(await within(confirmation).findByRole("alert")).toHaveTextContent("Esta oportunidad ya no admite esta inversión.");
    expect(api.wallet).toEqual(before.wallet);
    expect(capital()).toHaveTextContent("184.500,00 €");
    expect(useWalletStore.getState().balance?.available_cents).toBe(1_500_00);
    // Tornar a confirmar o tornar enrere no ho resol: només es pot tancar.
    expect(within(confirmation).getByRole("button", { name: "Confirmar inversión" })).toBeDisabled();
    expect(within(confirmation).getByRole("button", { name: "Volver" })).toBeDisabled();
  });

  it("en tancar, torna a llegir el detall per mostrar l'estat actual", async () => {
    const u = user();
    await openDialog(u);
    const confirmation = await goToConfirmation(u);
    api.detail = { ...api.detail, committed_cents: 300_000_00 };
    await confirmInvestment(u, confirmation);
    await within(confirmation).findByRole("alert");

    await u.click(screen.getByRole("button", { name: "Cerrar diálogo" }));
    expect(await screen.findByText("Financiación completada")).toBeInTheDocument();
    expect(capital()).toHaveTextContent("300.000,00 €");
  });
});

describe("9. Cancel·lar", () => {
  it.each([
    ["«Cancelar»", "Cancelar"],
    ["el botó de tancar", "Cerrar diálogo"],
  ])("%s torna al detall sense canviar el saldo ni el capital", async (_label, button) => {
    const u = user();
    await openDialog(u);
    await u.type(amountField(), "1000");
    await u.click(screen.getByRole("button", { name: button }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(capital()).toHaveTextContent("184.500,00 €");
    expect(post).not.toHaveBeenCalled();
  });
});

describe("10. Inversió restant inferior al mínim", () => {
  it("si només en queden 100,00 € (mínim de 250,00 €), permet invertir exactament el que falta", async () => {
    const u = user();
    api.detail = buildDetail({ committed_cents: 299_900_00 });
    const dialog = await openDialog(u);

    expect(valueOf(dialog, "Aportación mínima")).toHaveTextContent("100,00 €");
    expect(
      within(dialog).getByText(
        "Solo quedan 100,00 € para alcanzar el objetivo: la inversión debe ser de este importe, sin superar tu saldo disponible.",
      ),
    ).toBeInTheDocument();

    await u.type(amountField(), "50");
    await u.click(continueButton());
    expect(within(dialog).getByText("La inversión debe ser de 100,00 €, el importe pendiente para alcanzar el objetivo.")).toBeInTheDocument();

    await u.clear(amountField());
    await u.type(amountField(), "100");
    await u.click(continueButton());
    await confirmInvestment(u, await screen.findByRole("dialog", { name: "Confirma tu inversión" }));
    expect(await screen.findByRole("dialog", { name: "Inversión comprometida" })).toBeInTheDocument();
    expect(post).toHaveBeenCalledExactlyOnceWith("/opportunities/44/commitments", { amount_cents: 100_00 });
  });
});
