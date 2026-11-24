import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyWalletPage from "../src/pages/wallet/MyWalletPage";
import WalletDepositPage from "../src/pages/wallet/WalletDepositPage";
import { ApiError, fintechGet, fintechPost } from "../src/service/api";
import { getStripe } from "../src/service/stripe";
import { useAuthStore } from "../src/store/useAuthStore";
import { DEPOSIT_UNAVAILABLE, useWalletStore } from "../src/store/useWalletStore";

// Stripe simulat: el formulari de targeta és un iframe que jsdom no pot carregar.
const stripe = vi.hoisted(() => ({
  confirmPayment: vi.fn(),
  // Com es comporta el formulari de targeta en muntar-se.
  element: "ready" as "ready" | "loading" | "error",
  // Opcions de l'últim `<Elements>` muntat.
  options: null as null | { clientSecret?: string; locale?: string },
}));

vi.mock("@stripe/react-stripe-js", async () => {
  const React = await import("react");
  return {
    Elements: ({ children, options }: { children: React.ReactNode; options: typeof stripe.options }) => {
      stripe.options = options;
      return React.createElement(React.Fragment, null, children);
    },
    PaymentElement: ({ onReady, onLoadError }: { onReady?: () => void; onLoadError?: () => void }) => {
      React.useEffect(() => {
        if (stripe.element === "ready") onReady?.();
        if (stripe.element === "error") onLoadError?.();
      }, []);
      return React.createElement("div", { "data-testid": "payment-element" });
    },
    useStripe: () => ({ confirmPayment: stripe.confirmPayment }),
    useElements: () => ({ id: "elements" }),
  };
});

vi.mock("../src/service/stripe", () => ({
  getStripe: vi.fn(),
  stripeAppearance: () => ({ theme: "stripe" }),
}));

// Pàgines i stores reals; només simulem les crides a l'API.
vi.mock("../src/service/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/service/api")>(),
  fintechGet: vi.fn(),
  fintechPost: vi.fn(),
}));

const get = vi.mocked(fintechGet);
const post = vi.mocked(fintechPost);
const account = { id: 1, email: "user@example.com", created_at: "2026-10-27T10:00:00Z" };

// Intl separa l'import i el símbol amb un espai no separable (U+00A0).
const eur = (text: string) => text.replace(/ €/g, " €");

// Backend simulat: saldo del client i pagaments creats. El webhook de Stripe acredita l'import.
let server: { available: number; committed: number; intents: number; lastAmount: number };
const creditDeposit = () => {
  server.available += server.lastAmount;
};

function CurrentPath() {
  return <output aria-label="Ruta actual">{useLocation().pathname}</output>;
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/my-balance" element={<MyWalletPage />} />
        <Route path="/my-balance/deposit" element={<WalletDepositPage />} />
      </Routes>
      <CurrentPath />
    </MemoryRouter>,
  );

const user = () => userEvent.setup({ delay: null });
const amountField = () => screen.getByRole("textbox", { name: /Importe a ingresar/ });
const continueButton = () => screen.getByRole("button", { name: "Continuar al pago" });
const payButton = (amount = "100,00 €") => screen.getByRole("button", { name: eur(`Pagar ${amount}`) });

// Escriu l'import i passa al pas de pagament.
const goToPayment = async (u: ReturnType<typeof user>, amount = "100") => {
  await u.type(amountField(), amount);
  await u.click(continueButton());
  await screen.findByRole("heading", { name: "Pago con tarjeta" });
};

beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.setState({ ...useAuthStore.getInitialState(), active_account: account }, true);
  useWalletStore.getState().reset();
  stripe.element = "ready";
  stripe.options = null;
  vi.mocked(getStripe).mockReturnValue(Promise.resolve({} as never));

  // 250,00 € disponibles i 50,00 € compromesos: el disponible i el total no coincideixen.
  server = { available: 25000, committed: 5000, intents: 0, lastAmount: 0 };
  get.mockImplementation(async (path) => {
    if (path !== "/me/wallet") throw new Error(`Ruta inesperada: ${path}`);
    return { available_cents: server.available, committed_cents: server.committed, currency: "eur" };
  });
  post.mockImplementation(async (path, body) => {
    if (path !== "/me/wallet/deposit-intent") throw new Error(`Ruta inesperada: ${path}`);
    server.intents++;
    server.lastAmount = (body as { amount_cents: number }).amount_cents;
    return { client_secret: `pi_${server.intents}_secret`, payment_intent_id: `pi_${server.intents}` };
  });
  // Per defecte, la targeta 4242 4242 4242 4242: el pagament es completa i arriba el webhook.
  stripe.confirmPayment.mockImplementation(async () => {
    creditDeposit();
    return { paymentIntent: { status: "succeeded" } };
  });
});

describe("1. Accés a la pantalla d'ingrés", () => {
  it("«Ingresar fondos» de «Mi saldo» obre la pantalla amb el camp, el mínim i l'avís de simulació", async () => {
    const u = user();
    renderAt("/my-balance");
    await screen.findByText("250,00 €");
    await u.click(screen.getByRole("link", { name: "Ingresar fondos" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Ingresar fondos" })).toBeInTheDocument();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent("/my-balance/deposit");
    expect(amountField()).toHaveValue("");
    expect(amountField()).toHaveAccessibleDescription(eur("Importe mínimo: 0,50 €"));
    expect(
      screen.getByText("Entorno de simulación: no se realizará ningún cargo real. Usa una tarjeta de prueba de Stripe."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a mi saldo" })).toHaveAttribute("href", "/my-balance");
    expect(continueButton()).toBeEnabled();
  });
});

describe("2. Validació de l'import", () => {
  it.each([
    ["0,20", "El ingreso mínimo es de 0,50 €."],
    ["0,49", "El ingreso mínimo es de 0,50 €."],
    ["10,555", "Introduce un importe válido con hasta dos decimales."],
    ["1000000", "El ingreso máximo es de 999.999,99 €."],
  ])("amb «%s» no passa al pagament i mostra «%s» sota el camp", async (amount, message) => {
    const u = user();
    renderAt("/my-balance/deposit");
    await u.type(amountField(), amount);
    await u.click(continueButton());

    expect(amountField()).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(amountField()).toHaveAccessibleDescription(expect.stringContaining(eur(message)));
    expect(screen.queryByRole("heading", { name: "Pago con tarjeta" })).not.toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it("amb el camp buit demana l'import", async () => {
    const u = user();
    renderAt("/my-balance/deposit");
    await u.click(continueButton());
    expect(screen.getByText("Introduce el importe a ingresar.")).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it("l'error desapareix en tornar a escriure", async () => {
    const u = user();
    renderAt("/my-balance/deposit");
    await u.type(amountField(), "0,2");
    await u.click(continueButton());
    expect(screen.getByText("El ingreso mínimo es de 0,50 €.")).toBeInTheDocument();

    await u.type(amountField(), "5");
    expect(screen.queryByText("El ingreso mínimo es de 0,50 €.")).not.toBeInTheDocument();
    expect(amountField()).not.toHaveAttribute("aria-invalid");
  });

  it("dona format a l'import com la resta de xifres: punts de milers i dos decimals", async () => {
    const u = user();
    renderAt("/my-balance/deposit");
    await u.type(amountField(), "1500,5");
    expect(amountField()).toHaveValue("1.500,5");
    await u.tab();
    expect(amountField()).toHaveValue("1.500,50");
  });
});

describe("3. Pagament correcte", () => {
  it("amb 100,00 € i la targeta 4242 torna a «Mi saldo» amb «Ingreso realizado» i el saldo augmentat", async () => {
    const u = user();
    renderAt("/my-balance");
    await screen.findByText("250,00 €");
    await u.click(screen.getByRole("link", { name: "Ingresar fondos" }));
    await goToPayment(u);

    // El pagament es crea al backend amb l'import en cèntims i Stripe en rep el client_secret.
    expect(post).toHaveBeenCalledExactlyOnceWith("/me/wallet/deposit-intent", { amount_cents: 10000 });
    expect(stripe.options).toMatchObject({ clientSecret: "pi_1_secret", locale: "es" });
    const summary = screen.getByText("Importe a ingresar").closest("dl")!;
    expect(within(summary).getByText("100,00 €")).toBeInTheDocument();

    await u.click(payButton());
    expect(stripe.confirmPayment).toHaveBeenCalledExactlyOnceWith({ elements: { id: "elements" }, redirect: "if_required" });
    expect(await screen.findByText("Pago completado. Actualizando tu saldo…")).toBeInTheDocument();

    // L'store espera el webhook (un segon) abans de tornar a «Mi saldo».
    const notice = await screen.findByText("Ingreso realizado", {}, { timeout: 3000 });
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/my-balance$/);
    expect(notice.closest("[role=status]")).toHaveTextContent("Se han añadido 100,00 € a tu saldo disponible.");
    const balance = screen.getByRole("region", { name: "Saldo disponible" });
    expect(await within(balance).findByText("350,00 €")).toBeInTheDocument();
  });

  it("bloqueja «Pagar» i «Volver» mentre es confirma i no paga dues vegades", async () => {
    const u = user();
    let finish!: (value: unknown) => void;
    stripe.confirmPayment.mockReturnValue(new Promise((done) => { finish = done; }));
    renderAt("/my-balance/deposit");
    await goToPayment(u);

    await u.click(payButton());
    const processing = screen.getByRole("button", { name: "Procesando…" });
    expect(processing).toBeDisabled();
    expect(screen.getByRole("button", { name: "Volver" })).toBeDisabled();
    await u.click(processing);
    expect(stripe.confirmPayment).toHaveBeenCalledOnce();
    finish({ error: { type: "card_error", message: "Tu tarjeta ha sido rechazada." } });
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("no deixa pagar mentre el formulari de targeta es carrega", async () => {
    stripe.element = "loading";
    const u = user();
    renderAt("/my-balance/deposit");
    await goToPayment(u);
    expect(screen.getByText("Cargando el formulario de pago…")).toBeInTheDocument();
    expect(payButton()).toBeDisabled();
  });
});

describe("4. Pagament rebutjat", () => {
  it("amb la targeta 4000 0000 0000 0002 es queda al pagament amb el motiu, sense canviar el saldo, i permet tornar-ho a provar", async () => {
    const u = user();
    stripe.confirmPayment.mockResolvedValueOnce({
      error: { type: "card_error", code: "card_declined", message: "Tu tarjeta ha sido rechazada." },
    });
    renderAt("/my-balance/deposit");
    await goToPayment(u);
    const callsBeforePaying = get.mock.calls.length;

    await u.click(payButton());
    // Maqueta: títol «Pago rechazado», el motiu de Stripe i com continuar.
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Pago rechazado")).toBeInTheDocument();
    expect(
      within(alert).getByText("Tu tarjeta ha sido rechazada. Prueba con otra tarjeta. Tu saldo no ha cambiado."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pago con tarjeta" })).toBeInTheDocument();
    expect(server.available).toBe(25000);
    // No s'espera cap ingrés: el saldo no es torna a consultar.
    expect(get).toHaveBeenCalledTimes(callsBeforePaying);

    // Una altra targeta amb el mateix pagament.
    expect(payButton()).toBeEnabled();
    await u.click(payButton());
    expect(await screen.findByText("Ingreso realizado", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(stripe.confirmPayment).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenCalledOnce();
  });

  it.each([
    // Targeta 4000 0000 0000 9995: el motiu canvia segons la targeta.
    ["sense fons", "Tu tarjeta no tiene fondos suficientes.", "Tu tarjeta no tiene fondos suficientes."],
    ["sense punt final", "Tu tarjeta ha caducado", "Tu tarjeta ha caducado."],
    ["sense missatge", undefined, "Tu tarjeta ha sido rechazada."],
  ])("un rebuig %s mostra el motiu i com continuar", async (_label, message, reason) => {
    const u = user();
    stripe.confirmPayment.mockResolvedValueOnce({ error: { type: "card_error", message } });
    renderAt("/my-balance/deposit");
    await goToPayment(u);
    await u.click(payButton());
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(`Pago rechazado${reason} Prueba con otra tarjeta. Tu saldo no ha cambiado.`);
  });

  it("amb dades de targeta incompletes no mostra cap rebuig: Stripe marca el camp", async () => {
    const u = user();
    stripe.confirmPayment.mockResolvedValueOnce({
      error: { type: "validation_error", message: "El número de tu tarjeta está incompleto." },
    });
    renderAt("/my-balance/deposit");
    await goToPayment(u);
    await u.click(payButton());
    await waitFor(() => expect(payButton()).toBeEnabled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    ["un error de Stripe que no és de la targeta", { error: { type: "api_error", message: "Internal" } }],
    ["un pagament que no s'ha completat", { paymentIntent: { status: "requires_payment_method" } }],
  ])("davant %s mostra un missatge genèric", async (_label, result) => {
    const u = user();
    stripe.confirmPayment.mockResolvedValueOnce(result);
    renderAt("/my-balance/deposit");
    await goToPayment(u);
    await u.click(payButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se ha podido completar el pagoInténtalo de nuevo. Tu saldo no ha cambiado.",
    );
    expect(payButton()).toBeEnabled();
  });

  it("si Stripe falla (xarxa) mostra un error i torna a habilitar el pagament", async () => {
    const u = user();
    stripe.confirmPayment.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    renderAt("/my-balance/deposit");
    await goToPayment(u);
    await u.click(payButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se ha podido completar el pagoInténtalo de nuevo. Tu saldo no ha cambiado.",
    );
    expect(payButton()).toBeEnabled();
  });

  it("un pagament en procés no es dona per fet", async () => {
    const u = user();
    stripe.confirmPayment.mockResolvedValueOnce({ paymentIntent: { status: "processing" } });
    renderAt("/my-balance/deposit");
    await goToPayment(u);
    await u.click(payButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Pago en procesoEl pago se está procesando. Consulta tu saldo en unos minutos.",
    );
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent("/my-balance/deposit");
  });

  it("si el formulari de targeta no es pot carregar ho indica i no deixa pagar", async () => {
    stripe.element = "error";
    const u = user();
    renderAt("/my-balance/deposit");
    await goToPayment(u);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se ha podido cargar el formulario de pagoVuelve atrás e inténtalo de nuevo.",
    );
    expect(payButton()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Volver" })).toBeEnabled();
  });
});

describe("5. Cancel·lar o tornar enrere", () => {
  it("«Cancelar» al pas de l'import torna a «Mi saldo» sense crear cap pagament", async () => {
    const u = user();
    renderAt("/my-balance/deposit");
    await u.type(amountField(), "100");
    await u.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/my-balance$/);
    expect(await screen.findByText("250,00 €")).toBeInTheDocument();
    expect(screen.queryByText("Ingreso realizado")).not.toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it("«Volver» al pagament torna al pas de l'import amb l'import escrit; continuar prepara un pagament nou", async () => {
    const u = user();
    renderAt("/my-balance/deposit");
    await goToPayment(u);
    await u.click(screen.getByRole("button", { name: "Volver" }));

    expect(amountField()).toHaveValue("100,00");
    expect(amountField()).toHaveFocus();
    expect(stripe.confirmPayment).not.toHaveBeenCalled();

    await u.clear(amountField());
    await u.type(amountField(), "20");
    await u.click(continueButton());
    expect(await screen.findByRole("button", { name: eur("Pagar 20,00 €") })).toBeInTheDocument();
    expect(post).toHaveBeenLastCalledWith("/me/wallet/deposit-intent", { amount_cents: 2000 });
    expect(stripe.options).toMatchObject({ clientSecret: "pi_2_secret" });
  });
});

describe("Errors en preparar el pagament", () => {
  it("si Stripe no està configurat al servidor (503) ho indica i es queda a l'import", async () => {
    const u = user();
    post.mockRejectedValueOnce(new ApiError("Stripe is not configured", 503, null));
    renderAt("/my-balance/deposit");
    await u.type(amountField(), "100");
    await u.click(continueButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(DEPOSIT_UNAVAILABLE);
    expect(amountField()).toHaveValue("100,00");
    expect(screen.queryByRole("heading", { name: "Pago con tarjeta" })).not.toBeInTheDocument();
  });

  it("sense clau publicable de Stripe avisa i no crea cap pagament", async () => {
    vi.mocked(getStripe).mockReturnValue(null);
    const u = user();
    renderAt("/my-balance/deposit");
    await u.type(amountField(), "100");
    await u.click(continueButton());

    expect(screen.getByRole("alert")).toHaveTextContent(DEPOSIT_UNAVAILABLE);
    expect(post).not.toHaveBeenCalled();
  });

  it("un error de xarxa es pot tornar a provar", async () => {
    const u = user();
    post.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    renderAt("/my-balance/deposit");
    await u.type(amountField(), "100");
    await u.click(continueButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("No se ha podido preparar el pago. Inténtalo de nuevo.");

    await u.click(continueButton());
    expect(await screen.findByRole("heading", { name: "Pago con tarjeta" })).toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("mentre prepara el pagament bloqueja «Continuar al pago» i no el crea dues vegades", async () => {
    const u = user();
    let finish!: (value: unknown) => void;
    post.mockReturnValueOnce(new Promise((done) => { finish = done; }));
    renderAt("/my-balance/deposit");
    await u.type(amountField(), "100");
    await u.click(continueButton());

    const preparing = screen.getByRole("button", { name: "Preparando pago…" });
    expect(preparing).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    await u.click(preparing);
    finish({ client_secret: "pi_9_secret", payment_intent_id: "pi_9" });
    expect(await screen.findByRole("heading", { name: "Pago con tarjeta" })).toBeInTheDocument();
    expect(post).toHaveBeenCalledOnce();
  });
});

describe("«Mi saldo» després d'un ingrés", () => {
  it("si el saldo encara no reflecteix l'ingrés ho indica i permet actualitzar-lo", async () => {
    useWalletStore.setState({ lastDeposit: { amount_cents: 10000, reflected: false } });
    const u = user();
    renderAt("/my-balance");
    await screen.findByText("250,00 €");

    const notice = screen.getByText("Ingreso realizado").closest("[role=status]")!;
    expect(notice).toHaveTextContent(
      "Tu pago de 100,00 € se ha completado. El saldo puede tardar unos instantes en actualizarse.",
    );
    server.available = 35000;
    await u.click(within(notice as HTMLElement).getByRole("button", { name: "Actualizar saldo" }));
    expect(await screen.findByText("350,00 €")).toBeInTheDocument();
  });

  it("l'avís només es mostra una vegada: en tornar a entrar ja no hi és", async () => {
    useWalletStore.setState({ lastDeposit: { amount_cents: 10000, reflected: true } });
    const { unmount } = renderAt("/my-balance");
    expect(screen.getByText("Ingreso realizado")).toBeInTheDocument();
    await screen.findByText("250,00 €");
    unmount();

    renderAt("/my-balance");
    await screen.findByText("250,00 €");
    expect(screen.queryByText("Ingreso realizado")).not.toBeInTheDocument();
    await waitFor(() => expect(useWalletStore.getState().lastDeposit).toBeNull());
  });
});
