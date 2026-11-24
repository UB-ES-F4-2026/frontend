import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RealEstateDetail from "../src/pages/opportunities/real-estate/RealEstateDetail";
import MyWalletPage from "../src/pages/wallet/MyWalletPage";
import { ApiError, fintechGet, fintechPost } from "../src/service/api";
import { useAuthStore } from "../src/store/useAuthStore";
import { useOpportunityStore, type RealEstateOpportunityGetResponse } from "../src/store/useOpportunityStore";
import { useWalletStore } from "../src/store/useWalletStore";

// Pàgina i stores reals; només simulem les crides a l'API.
vi.mock("../src/service/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/service/api")>(),
  fintechGet: vi.fn(),
  fintechPost: vi.fn(),
}));

const get = vi.mocked(fintechGet);
const post = vi.mocked(fintechPost);

const wallet = (available_cents: number, committed_cents = 0) => ({ available_cents, committed_cents, currency: "eur" });

// Escenari dels mockups: 45.000,00 € compromesos d'un objectiu de 72.000,00 € i 250,00 € disponibles.
const buildDetail = (overrides: Partial<RealEstateOpportunityGetResponse> = {}): RealEstateOpportunityGetResponse => ({
  id: 7,
  user_id: 10,
  type: "real_estate",
  title: "Piso en Girona",
  description: "Rehabilitación de un edificio residencial.",
  location: "Girona, Girona, España",
  cover_image_url: null,
  target_amount_cents: 72_000_00,
  committed_cents: 45_000_00,
  minimum_contribution_cents: 100_00,
  deadline: "2099-12-31T22:59:00.000Z",
  date_published: "2026-10-01T09:00:00.000Z",
  date_closed: null,
  created_at: "2026-09-25T10:00:00.000Z",
  updated_at: "2026-10-01T09:00:00.000Z",
  server_time: "2026-11-20T10:00:00.000Z",
  promoter: {
    user_id: 10,
    legal_name: "Promociones Girona S.L.",
    image_url: null,
    published_projects_count: 3,
    experience_years: 8,
    location: "Girona",
  },
  real_estate: {
    purpose: "renovation",
    intended_use: "rental",
    asset_type: "residential",
    surface_m2: 300,
    planned_housing_units: 4,
    estimated_works_end: null,
    estimated_rental_start: null,
    public_latitude: null,
    public_longitude: null,
    images: null,
  },
  ...overrides,
});

// Resposta de POST /opportunities/{id}/commitments.
const commitmentResult = (amount: number, committedAfter: number, walletAfter: ReturnType<typeof wallet>) => ({
  commitment: { id: 1, opportunity_id: 7, amount_cents: amount, created_at: "2026-11-20T10:00:00Z" },
  opportunity: { id: 7, target_amount_cents: 72_000_00, committed_cents: committedAfter },
  wallet: walletAfter,
});

let api: { detail: RealEstateOpportunityGetResponse; wallet: ReturnType<typeof wallet> };

const renderDetail = () =>
  render(
    <MemoryRouter initialEntries={["/opportunities/real-estate/7"]}>
      <Routes>
        <Route path="/opportunities/real-estate/:id" element={<RealEstateDetail />} />
        <Route path="/my-balance" element={<MyWalletPage />} />
      </Routes>
    </MemoryRouter>,
  );

const user = () => userEvent.setup({ delay: null });

// Obre el diàleg des del detall i espera que el saldo estigui carregat.
const openDialog = async (u = user()) => {
  renderDetail();
  await u.click(await screen.findByRole("button", { name: "Quiero invertir" }));
  const dialog = await screen.findByRole("dialog", { name: "Comprometer aportación" });
  await within(dialog).findByText("250,00 €");
  return dialog;
};

const amountField = () => screen.getByRole("textbox", { name: /Importe de la aportación/ });
// Valor que acompanya una etiqueta d'una llista de resum (<dt>/<dd>).
const valueOf = (container: HTMLElement, label: string) => within(container).getByText(label).nextElementSibling;

const goToConfirmation = async (u: ReturnType<typeof user>, amount = "100") => {
  await u.type(amountField(), amount);
  await u.click(screen.getByRole("button", { name: "Continuar" }));
  return screen.findByRole("dialog", { name: "Confirma tu aportación" });
};

beforeEach(() => {
  vi.resetAllMocks();
  api = { detail: buildDetail(), wallet: wallet(250_00) };
  get.mockImplementation(async (path: string) => {
    if (path === "/me/wallet") return api.wallet;
    if (path === "/opportunities/7") return api.detail;
    throw new ApiError("Not found", 404, null);
  });
  useAuthStore.setState({
    ...useAuthStore.getInitialState(),
    active_account: { id: 1, email: "user@example.com", created_at: "2026-10-27T10:00:00Z" },
  }, true);
  useOpportunityStore.setState(useOpportunityStore.getInitialState(), true);
  useWalletStore.getState().reset();
});

describe("1. Obrir el formulari d'aportació", () => {
  it("«Quiero invertir» obre el diàleg amb el saldo, l'aportació mínima, el pendent i el camp d'import", async () => {
    const dialog = await openDialog();

    expect(within(dialog).getByText("Piso en Girona")).toBeInTheDocument();
    expect(valueOf(dialog, "Saldo disponible")).toHaveTextContent("250,00 €");
    expect(valueOf(dialog, "Aportación mínima")).toHaveTextContent("100,00 €");
    expect(valueOf(dialog, "Pendiente")).toHaveTextContent("27.000,00 €");
    expect(amountField()).toBeInTheDocument();
    expect(within(dialog).getByText("Entre 100,00 € y 27.000,00 €, sin superar tu saldo disponible.")).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("/me/wallet", expect.anything());
  });

  it("mentre consulta el saldo no deixa continuar", async () => {
    api.wallet = wallet(250_00);
    get.mockImplementation(async (path: string) => {
      if (path === "/me/wallet") return new Promise(() => {});
      return api.detail;
    });
    const u = user();
    renderDetail();
    await u.click(await screen.findByRole("button", { name: "Quiero invertir" }));
    const dialog = await screen.findByRole("dialog", { name: "Comprometer aportación" });
    expect(within(dialog).getByRole("status")).toHaveTextContent("Cargando…");
    expect(within(dialog).getByRole("button", { name: "Continuar" })).toBeDisabled();
  });

  it("si no es pot consultar el saldo, ho indica i permet reintentar", async () => {
    get.mockImplementation(async (path: string) => {
      if (path === "/me/wallet") throw new TypeError("Failed to fetch");
      return api.detail;
    });
    const u = user();
    renderDetail();
    await u.click(await screen.findByRole("button", { name: "Quiero invertir" }));
    const dialog = await screen.findByRole("dialog", { name: "Comprometer aportación" });
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("No se ha podido consultar tu saldo.");
    expect(within(dialog).getByRole("button", { name: "Continuar" })).toBeDisabled();

    get.mockImplementation(async (path: string) => (path === "/me/wallet" ? api.wallet : api.detail));
    await u.click(within(dialog).getByRole("button", { name: "Reintentar" }));
    expect(await within(dialog).findByText("250,00 €")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Continuar" })).toBeEnabled();
  });
});

describe("2. Validació de l'import", () => {
  it.each([
    ["inferior a l'aportació mínima", "99,99", "La aportación mínima es de 100,00 €."],
    ["superior a l'import pendent", "27000,01", "El importe no puede superar los 27.000,00 € pendientes para alcanzar el objetivo."],
    ["amb més de dos decimals", "100,555", "El importe no puede tener más de dos decimales."],
  ])("un import %s no passa a la confirmació i mostra l'error sota el camp", async (_label, amount, message) => {
    const u = user();
    const dialog = await openDialog(u);
    await u.type(amountField(), amount);
    await u.click(within(dialog).getByRole("button", { name: "Continuar" }));

    expect(within(dialog).getByText(message)).toBeInTheDocument();
    expect(amountField()).toHaveAttribute("aria-invalid", "true");
    // L'error s'afegeix a la descripció del camp; Intl separa el «€» amb un espai no separable.
    expect(amountField()).toHaveAccessibleDescription(expect.stringContaining(message.replace(/ €/g, " €")));
    expect(screen.queryByRole("dialog", { name: "Confirma tu aportación" })).not.toBeInTheDocument();
  });

  it("l'error desapareix en tornar a escriure", async () => {
    const u = user();
    const dialog = await openDialog(u);
    await u.click(within(dialog).getByRole("button", { name: "Continuar" }));
    expect(within(dialog).getByText("Introduce el importe de la aportación.")).toBeInTheDocument();
    await u.type(amountField(), "1");
    expect(within(dialog).queryByText("Introduce el importe de la aportación.")).not.toBeInTheDocument();
    expect(amountField()).not.toHaveAttribute("aria-invalid", "true");
  });
});

describe("Format de l'import", () => {
  it("afegeix els punts de milers mentre s'escriu i completa els decimals en sortir del camp", async () => {
    const u = user();
    await openDialog(u);
    await u.type(amountField(), "114000000");
    expect(amountField()).toHaveValue("114.000.000");
    await u.tab();
    expect(amountField()).toHaveValue("114.000.000,00");
  });

  it("accepta el punt del teclat numèric com a coma decimal", async () => {
    const u = user();
    await openDialog(u);
    await u.type(amountField(), "1000.5");
    expect(amountField()).toHaveValue("1.000,5");
    await u.tab();
    expect(amountField()).toHaveValue("1.000,50");
  });

  it("no modifica un import no vàlid en sortir del camp, perquè l'error s'entengui", async () => {
    const u = user();
    const dialog = await openDialog(u);
    await u.type(amountField(), "100,555");
    await u.click(within(dialog).getByRole("button", { name: "Continuar" }));
    expect(amountField()).toHaveValue("100,555");
    expect(within(dialog).getByText("El importe no puede tener más de dos decimales.")).toBeInTheDocument();
  });

  it("l'import formatat arriba igual a la confirmació", async () => {
    api.wallet = wallet(2_000_00);
    const u = user();
    renderDetail();
    await u.click(await screen.findByRole("button", { name: "Quiero invertir" }));
    await within(await screen.findByRole("dialog", { name: "Comprometer aportación" })).findByText("2.000,00 €");
    const confirmation = await goToConfirmation(u, "1500");
    expect(valueOf(confirmation, "Aportación")).toHaveTextContent("1.500,00 €");
    expect(valueOf(confirmation, "Saldo disponible tras la aportación")).toHaveTextContent("500,00 €");
  });
});

describe("3. Saldo insuficient", () => {
  it("amb 250,00 € disponibles, 300,00 € no passa a la confirmació i ofereix «Ingresar fondos»", async () => {
    const u = user();
    const dialog = await openDialog(u);
    await u.type(amountField(), "300");
    await u.click(within(dialog).getByRole("button", { name: "Continuar" }));

    expect(within(dialog).getByText("No tienes saldo suficiente para esta aportación.")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Ingresar fondos" })).toHaveAttribute("href", "/my-balance/deposit");
    expect(screen.queryByRole("dialog", { name: "Confirma tu aportación" })).not.toBeInTheDocument();
  });
});

describe("4. Confirmació de l'aportació", () => {
  it("mostra l'import, l'oportunitat i el saldo que quedarà", async () => {
    const u = user();
    await openDialog(u);
    const dialog = await goToConfirmation(u);

    expect(valueOf(dialog, "Aportación")).toHaveTextContent("100,00 €");
    expect(valueOf(dialog, "Oportunidad")).toHaveTextContent("Piso en Girona");
    expect(valueOf(dialog, "Saldo disponible tras la aportación")).toHaveTextContent("150,00 €");
  });

  it("«Confirmar aportación» només s'activa en acceptar els riscos", async () => {
    const u = user();
    await openDialog(u);
    const dialog = await goToConfirmation(u);
    const confirm = within(dialog).getByRole("button", { name: "Confirmar aportación" });
    const risks = within(dialog).getByRole("checkbox", { name: /Entiendo que la inversión conlleva riesgos/ });

    expect(confirm).toBeDisabled();
    await u.click(risks);
    expect(confirm).toBeEnabled();
    await u.click(risks);
    expect(confirm).toBeDisabled();
    expect(post).not.toHaveBeenCalled();
  });

  it("«Volver» torna al pas de l'import amb l'import conservat", async () => {
    const u = user();
    await openDialog(u);
    const dialog = await goToConfirmation(u, "120,50");
    await u.click(within(dialog).getByRole("button", { name: "Volver" }));

    expect(await screen.findByRole("dialog", { name: "Comprometer aportación" })).toBeInTheDocument();
    expect(amountField()).toHaveValue("120,50");
  });
});

describe("5. Aportació comprometida", () => {
  it("compromet 100,00 €, actualitza el detall i «Mi saldo» mostra 150,00 € disponibles i 100,00 € compromesos", async () => {
    post.mockResolvedValue(commitmentResult(100_00, 45_100_00, wallet(150_00, 100_00)));
    const u = user();
    await openDialog(u);
    const confirmation = await goToConfirmation(u);
    await u.click(within(confirmation).getByRole("checkbox"));
    await u.click(within(confirmation).getByRole("button", { name: "Confirmar aportación" }));

    const done = await screen.findByRole("dialog", { name: "Aportación comprometida" });
    expect(post).toHaveBeenCalledExactlyOnceWith("/opportunities/7/commitments", { amount_cents: 100_00 });
    expect(within(done).getByRole("status")).toHaveTextContent(
      "Has comprometido 100,00 € en esta oportunidad. Tu saldo disponible ahora es de 150,00 €.",
    );

    // El detall de darrere ja mostra el capital i el percentatge nous.
    expect(screen.getByText("45.100,00 €", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("62,6 % del objetivo")).toBeInTheDocument();

    api.wallet = wallet(150_00, 100_00);
    await u.click(within(done).getByRole("button", { name: "Ver mi saldo" }));
    const balance = await screen.findByRole("region", { name: "Saldo disponible" });
    expect(await within(balance).findByText("150,00 €")).toBeInTheDocument();
    expect(valueOf(balance, "Saldo comprometido")).toHaveTextContent("100,00 €");
  });

  it("«Cerrar» tanca el diàleg i deixa el detall actualitzat", async () => {
    post.mockResolvedValue(commitmentResult(100_00, 45_100_00, wallet(150_00, 100_00)));
    const u = user();
    await openDialog(u);
    const confirmation = await goToConfirmation(u);
    await u.click(within(confirmation).getByRole("checkbox"));
    await u.click(within(confirmation).getByRole("button", { name: "Confirmar aportación" }));
    const done = await screen.findByRole("dialog", { name: "Aportación comprometida" });

    await u.click(within(done).getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("62,6 % del objetivo")).toBeInTheDocument();
  });
});

describe("6. Objectiu assolit", () => {
  it("si l'aportació completa l'objectiu, el detall mostra «Financiación completada» i desactiva «Quiero invertir»", async () => {
    api.detail = buildDetail({ committed_cents: 71_500_00 });
    post.mockResolvedValue(commitmentResult(500_00, 72_000_00, wallet(0, 500_00)));
    api.wallet = wallet(1_000_00);
    const u = user();
    renderDetail();
    await u.click(await screen.findByRole("button", { name: "Quiero invertir" }));
    const dialog = await screen.findByRole("dialog", { name: "Comprometer aportación" });
    await within(dialog).findByText("1.000,00 €");
    const confirmation = await goToConfirmation(u, "500");
    await u.click(within(confirmation).getByRole("checkbox"));
    await u.click(within(confirmation).getByRole("button", { name: "Confirmar aportación" }));
    await u.click(within(await screen.findByRole("dialog", { name: "Aportación comprometida" })).getByRole("button", { name: "Cerrar" }));

    expect(screen.getByText("Financiación completada")).toBeInTheDocument();
    expect(screen.getByText("100,0 % del objetivo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quiero invertir" })).toBeDisabled();
  });
});

describe("7. L'oportunitat deixa d'admetre l'aportació", () => {
  it("mostra el missatge i no canvia ni el saldo ni el capital compromès", async () => {
    post.mockRejectedValue(new ApiError("Opportunity no longer accepts this contribution", 409, null));
    const u = user();
    await openDialog(u);
    const confirmation = await goToConfirmation(u);
    await u.click(within(confirmation).getByRole("checkbox"));
    await u.click(within(confirmation).getByRole("button", { name: "Confirmar aportación" }));

    expect(await within(confirmation).findByRole("alert")).toHaveTextContent("Esta oportunidad ya no admite esta aportación.");
    expect(within(confirmation).getByRole("button", { name: "Confirmar aportación" })).toBeDisabled();
    expect(useWalletStore.getState().balance).toMatchObject({ available_cents: 250_00, committed_cents: 0 });
    expect(useOpportunityStore.getState().realEstateOpportunity?.committed_cents).toBe(45_000_00);
    expect(screen.getByText("62,5 % del objetivo")).toBeInTheDocument();
  });

  it("si el saldo ha canviat abans de confirmar, ho indica amb l'enllaç «Ingresar fondos»", async () => {
    post.mockRejectedValue(new ApiError("Insufficient funds", 409, null));
    const u = user();
    await openDialog(u);
    const confirmation = await goToConfirmation(u);
    await u.click(within(confirmation).getByRole("checkbox"));
    await u.click(within(confirmation).getByRole("button", { name: "Confirmar aportación" }));

    const alert = await within(confirmation).findByRole("alert");
    expect(alert).toHaveTextContent("No tienes saldo suficiente para esta aportación.");
    expect(within(alert).getByRole("link", { name: "Ingresar fondos" })).toHaveAttribute("href", "/my-balance/deposit");
  });

  it("si l'oportunitat ja no és disponible (404), ho indica i no deixa tornar a confirmar", async () => {
    post.mockRejectedValue(new ApiError("Opportunity not available", 404, null));
    const u = user();
    await openDialog(u);
    const confirmation = await goToConfirmation(u);
    await u.click(within(confirmation).getByRole("checkbox"));
    await u.click(within(confirmation).getByRole("button", { name: "Confirmar aportación" }));

    expect(await within(confirmation).findByRole("alert")).toHaveTextContent("Esta oportunidad ya no está disponible.");
    expect(within(confirmation).getByRole("button", { name: "Confirmar aportación" })).toBeDisabled();
    expect(useOpportunityStore.getState().realEstateOpportunity?.committed_cents).toBe(45_000_00);
  });

  it.each([
    ["el mínim ha canviat (422)", new ApiError("Amount below the minimum contribution", 422, null), "El importe es inferior a la aportación mínima."],
    ["l'import no té un format vàlid (422)", new ApiError("HTTP Error 422", 422, { detail: [{ loc: ["body", "amount_cents"] }] }), "Introduce un importe válido, por ejemplo 100,00."],
  ])("si %s, torna al pas de l'import amb l'error sota el camp", async (_label, error, message) => {
    post.mockRejectedValue(error);
    const u = user();
    await openDialog(u);
    const confirmation = await goToConfirmation(u, "150");
    await u.click(within(confirmation).getByRole("checkbox"));
    await u.click(within(confirmation).getByRole("button", { name: "Confirmar aportación" }));

    const dialog = await screen.findByRole("dialog", { name: "Comprometer aportación" });
    expect(amountField()).toHaveValue("150,00");
    expect(amountField()).toHaveAttribute("aria-invalid", "true");
    expect(amountField()).toHaveAccessibleDescription(expect.stringContaining(message));
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    expect(useWalletStore.getState().balance).toMatchObject({ available_cents: 250_00, committed_cents: 0 });
  });

  it("si la sessió ha caducat (401), no mostra cap missatge al diàleg (SessionManager porta al login)", async () => {
    post.mockRejectedValue(new ApiError("Invalid or missing session", 401, null));
    const u = user();
    await openDialog(u);
    const confirmation = await goToConfirmation(u);
    await u.click(within(confirmation).getByRole("checkbox"));
    await u.click(within(confirmation).getByRole("button", { name: "Confirmar aportación" }));

    await vi.waitFor(() => expect(useOpportunityStore.getState().commitError).toBe("session_expired"));
    expect(within(confirmation).queryByRole("alert")).not.toBeInTheDocument();
  });

  // Regressió: «Volver» esborrava l'error i permetia tornar a enviar la mateixa aportació.
  it.each([
    ["404 no disponible", new ApiError("Opportunity not available", 404, null)],
    ["409 ja no admet", new ApiError("Opportunity no longer accepts this contribution", 409, null)],
    ["409 saldo insuficient", new ApiError("Insufficient funds", 409, null)],
  ])("després d'un %s no es pot tornar enrere ni reenviar l'aportació", async (_label, error) => {
    post.mockRejectedValue(error);
    const u = user();
    await openDialog(u);
    const confirmation = await goToConfirmation(u);
    await u.click(within(confirmation).getByRole("checkbox"));
    await u.click(within(confirmation).getByRole("button", { name: "Confirmar aportación" }));
    await within(confirmation).findByRole("alert");

    const back = within(confirmation).getByRole("button", { name: "Volver" });
    expect(back).toBeDisabled();
    expect(within(confirmation).getByRole("button", { name: "Confirmar aportación" })).toBeDisabled();
    expect(within(confirmation).getByText("Cierra este diálogo para ver la oportunidad actualizada.")).toBeInTheDocument();

    await u.click(back);
    expect(screen.queryByRole("dialog", { name: "Comprometer aportación" })).not.toBeInTheDocument();
    expect(post).toHaveBeenCalledOnce();
  });

  it("en tancar després d'un error, torna a llegir el detall sense recarregar la pàgina", async () => {
    post.mockRejectedValue(new ApiError("Opportunity no longer accepts this contribution", 409, null));
    const u = user();
    await openDialog(u);
    const confirmation = await goToConfirmation(u);
    await u.click(within(confirmation).getByRole("checkbox"));
    await u.click(within(confirmation).getByRole("button", { name: "Confirmar aportación" }));
    await within(confirmation).findByRole("alert");

    // Mentrestant, una altra persona ha completat l'objectiu.
    api.detail = buildDetail({ committed_cents: 72_000_00 });
    const detailReads = get.mock.calls.filter(([path]) => path === "/opportunities/7").length;
    await u.click(within(confirmation).getByRole("button", { name: "Cerrar diálogo" }));

    expect(await screen.findByText("Financiación completada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quiero invertir" })).toBeDisabled();
    expect(get.mock.calls.filter(([path]) => path === "/opportunities/7")).toHaveLength(detailReads + 1);
    expect(post).toHaveBeenCalledOnce();
  });

  it("després d'un 422 pel mínim, valida amb el mínim actualitzat i no reenvia el mateix import", async () => {
    post.mockRejectedValue(new ApiError("Amount below the minimum contribution", 422, null));
    const u = user();
    await openDialog(u);
    const confirmation = await goToConfirmation(u, "150");
    await u.click(within(confirmation).getByRole("checkbox"));

    // El mínim ha pujat a 200,00 € des que es va obrir el diàleg.
    api.detail = buildDetail({ minimum_contribution_cents: 200_00 });
    await u.click(within(confirmation).getByRole("button", { name: "Confirmar aportación" }));

    const dialog = await screen.findByRole("dialog", { name: "Comprometer aportación" });
    await vi.waitFor(() => expect(valueOf(dialog, "Aportación mínima")).toHaveTextContent("200,00 €"));
    await u.click(within(dialog).getByRole("button", { name: "Continuar" }));
    expect(within(dialog).getByText("La aportación mínima es de 200,00 €.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Confirma tu aportación" })).not.toBeInTheDocument();
    expect(post).toHaveBeenCalledOnce();
  });

  it("davant un error de connexió permet tornar a confirmar", async () => {
    post.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    post.mockResolvedValueOnce(commitmentResult(100_00, 45_100_00, wallet(150_00, 100_00)));
    const u = user();
    await openDialog(u);
    const confirmation = await goToConfirmation(u);
    await u.click(within(confirmation).getByRole("checkbox"));
    await u.click(within(confirmation).getByRole("button", { name: "Confirmar aportación" }));

    expect(await within(confirmation).findByRole("alert")).toHaveTextContent("No se ha podido comprometer la aportación.");
    await u.click(within(confirmation).getByRole("button", { name: "Confirmar aportación" }));
    expect(await screen.findByRole("dialog", { name: "Aportación comprometida" })).toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(2);
  });
});

describe("8. Cancel·lar", () => {
  it.each([
    ["«Cancelar»", async (u: ReturnType<typeof user>, dialog: HTMLElement) => u.click(within(dialog).getByRole("button", { name: "Cancelar" }))],
    ["el botó de tancar", async (u: ReturnType<typeof user>, dialog: HTMLElement) => u.click(within(dialog).getByRole("button", { name: "Cerrar diálogo" }))],
    ["la tecla Escape", async (u: ReturnType<typeof user>) => u.keyboard("{Escape}")],
  ])("%s torna al detall sense canviar el saldo ni el capital compromès", async (_label, close) => {
    const u = user();
    const dialog = await openDialog(u);
    await u.type(amountField(), "100");
    await close(u, dialog);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText("62,5 % del objetivo")).toBeInTheDocument();
  });

  it("en tornar-lo a obrir comença de zero", async () => {
    const u = user();
    const dialog = await openDialog(u);
    await u.type(amountField(), "300");
    await u.click(within(dialog).getByRole("button", { name: "Continuar" }));
    await u.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await u.click(screen.getByRole("button", { name: "Quiero invertir" }));
    const reopened = await screen.findByRole("dialog", { name: "Comprometer aportación" });
    expect(amountField()).toHaveValue("");
    expect(within(reopened).queryByText("No tienes saldo suficiente para esta aportación.")).not.toBeInTheDocument();
  });
});

describe("9. Inversió restant inferior al mínim", () => {
  it("permet aportar exactament el pendent encara que sigui inferior al mínim", async () => {
    api.detail = buildDetail({ committed_cents: 71_950_00 });
    post.mockResolvedValue(commitmentResult(50_00, 72_000_00, wallet(200_00, 50_00)));
    const u = user();
    const dialog = await openDialog(u);

    expect(valueOf(dialog, "Aportación mínima")).toHaveTextContent("50,00 €");
    expect(valueOf(dialog, "Pendiente")).toHaveTextContent("50,00 €");
    expect(within(dialog).getByText(/Solo quedan 50,00 € para alcanzar el objetivo/)).toBeInTheDocument();

    const confirmation = await goToConfirmation(u, "50");
    await u.click(within(confirmation).getByRole("checkbox"));
    await u.click(within(confirmation).getByRole("button", { name: "Confirmar aportación" }));
    expect(await screen.findByRole("dialog", { name: "Aportación comprometida" })).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith("/opportunities/7/commitments", { amount_cents: 50_00 });
  });

  it("no accepta menys del pendent", async () => {
    api.detail = buildDetail({ committed_cents: 71_950_00 });
    const u = user();
    const dialog = await openDialog(u);
    await u.type(amountField(), "40");
    await u.click(within(dialog).getByRole("button", { name: "Continuar" }));
    expect(within(dialog).getByText("La aportación debe ser de 50,00 €, el importe pendiente para alcanzar el objetivo.")).toBeInTheDocument();
  });
});
