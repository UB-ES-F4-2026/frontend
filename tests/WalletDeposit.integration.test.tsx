import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SessionManager from "../src/components/SessionManager";
import MyWalletPage from "../src/pages/wallet/MyWalletPage";
import WalletDepositPage from "../src/pages/wallet/WalletDepositPage";
import { useAuthStore } from "../src/store/useAuthStore";
import { useWalletStore } from "../src/store/useWalletStore";

// Excepció a «només se simula fetch»: Stripe és un servei de tercers i el seu formulari de targeta
// és un iframe de js.stripe.com que jsdom no pot carregar. Se simula Stripe Elements igual que a
// tests/WalletDeposit.test.tsx, i res més: pàgines, stores, src/service/api.ts i
// src/service/stripe.ts són els reals.
const stripe = vi.hoisted(() => ({
  confirmPayment: vi.fn(),
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
    // El formulari de targeta simulat es dona per carregat de seguida.
    PaymentElement: ({ onReady }: { onReady?: () => void }) => {
      React.useEffect(() => onReady?.(), [onReady]);
      return React.createElement("div", { "data-testid": "payment-element" });
    },
    useStripe: () => ({ confirmPayment: stripe.confirmPayment }),
    useElements: () => ({ id: "elements" }),
  };
});

// Stripe.js es descarrega de js.stripe.com: se'n simula la càrrega, no el nostre src/service/stripe.ts.
vi.mock("@stripe/stripe-js", () => ({ loadStripe: () => Promise.resolve({}) }));

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
const intentCalls = () => fetchMock.mock.calls.filter(([url]) => url === "/api/me/wallet/deposit-intent");

// Formes reals del backend: UserRead, BalanceRead i DepositIntentResponse (app/schemas).
const SESSION = reply({
  id: 1, email: "ana@example.com", first_name: "Ana", last_name: "García López",
  phone: "+34612345678", created_at: "2026-11-09T12:00:00Z", is_promoter: false,
});
const wallet = (available_cents: number, committed_cents = 0) => ({ available_cents, committed_cents, currency: "eur" });
const intent = (n: number) => ({ client_secret: `pi_${n}_secret_abc`, payment_intent_id: `pi_${n}` });
const POST_INTENT = "POST /api/me/wallet/deposit-intent";

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  // reset() també descarta el pagament preparat i l'espera del saldo d'un test anterior.
  useWalletStore.getState().reset();
  useWalletStore.setState(useWalletStore.getInitialState(), true);
  stripe.confirmPayment.mockReset();
  stripe.options = null;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  // Sense clau publicable la pàgina no prepara cap pagament. El valor és fictici.
  vi.stubEnv("VITE_STRIPE_PUBLISHABLE_KEY", "clau-publicable-de-prova");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const renderDeposit = () => {
  render(
    <MemoryRouter initialEntries={["/my-balance/deposit"]}>
      <SessionManager />
      <Routes>
        <Route path="/my-balance" element={<MyWalletPage />} />
        <Route path="/my-balance/deposit" element={<WalletDepositPage />} />
        <Route path="/login" element={<h1>Inicio de sesión simulado</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup({ delay: null });
};
const amountField = () => screen.getByRole("textbox", { name: /Importe a ingresar/ });
const continueButton = () => screen.getByRole("button", { name: "Continuar al pago" });
// Intl separa l'import i el símbol amb un espai no separable, que el nom accessible conserva.
const payButton = () => screen.getByRole("button", { name: /^Pagar 100,00\s€$/ });

// Escriu 100 € i arriba al pas de pagament.
const goToPayment = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(amountField(), "100");
  await user.click(continueButton());
  await screen.findByRole("heading", { name: "Pago con tarjeta" });
};

describe("Ingrés: del formulari a POST /api/me/wallet/deposit-intent", () => {
  it("prepara el pagament amb un sol POST, passa el client_secret a Stripe i torna a «Mi saldo» amb el saldo acreditat", async () => {
    // Saldo que té el backend: el webhook de Stripe l'augmenta quan el pagament es completa.
    let available = 25_000;
    const prepared = deferred();
    serve({
      "GET /api/auth/me": SESSION,
      [POST_INTENT]: prepared.handler,
      "GET /api/me/wallet": () => Promise.resolve(json(wallet(available, 5_000))),
    });
    stripe.confirmPayment.mockImplementation(async () => {
      available += 10_000;
      return { paymentIntent: { status: "succeeded" } };
    });
    const user = renderDeposit();

    // Un import per sota del mínim es queda al navegador.
    await user.type(amountField(), "0,49");
    await user.click(continueButton());
    expect(screen.getByText("El ingreso mínimo es de 0,50 €.")).toBeInTheDocument();
    expect(requests()).toEqual(["GET /api/auth/me"]);

    await user.clear(amountField());
    await user.type(amountField(), "100");
    await user.dblClick(continueButton());
    expect(screen.getByRole("button", { name: "Preparando pago…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(amountField()).toHaveAttribute("readonly");
    // El saldo d'abans de pagar es llegeix alhora: servirà per saber quan s'ha acreditat l'ingrés.
    expect(requests()).toEqual(["GET /api/auth/me", POST_INTENT, "GET /api/me/wallet"]);
    const [url, init] = intentCalls()[0];
    expect(url).toBe("/api/me/wallet/deposit-intent");
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("include");
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(String(init?.body))).toEqual({ amount_cents: 10_000 });

    await prepared.resolve(json(intent(1)));
    expect(await screen.findByRole("heading", { name: "Pago con tarjeta" })).toBeInTheDocument();
    expect(stripe.options).toMatchObject({ clientSecret: "pi_1_secret_abc", locale: "es" });
    expect(screen.getByText("Importe a ingresar").nextElementSibling).toHaveTextContent("100,00 €");

    await user.click(payButton());
    expect(stripe.confirmPayment).toHaveBeenCalledExactlyOnceWith({ elements: { id: "elements" }, redirect: "if_required" });
    expect(await screen.findByText("Pago completado. Actualizando tu saldo…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Procesando…" })).toBeDisabled();

    // El store torna a llegir el saldo al cap d'un segon (interval real de l'espera del webhook).
    const notice = await screen.findByText("Ingreso realizado", {}, { timeout: 3000 });
    expect(notice.closest("[role=status]")).toHaveTextContent("Se han añadido 100,00 € a tu saldo disponible.");
    const card = screen.getByRole("region", { name: "Saldo disponible" });
    expect(await within(card).findByText("350,00 €")).toBeInTheDocument();
    expect(requests()).toEqual([
      "GET /api/auth/me", POST_INTENT, "GET /api/me/wallet", "GET /api/me/wallet", "GET /api/me/wallet",
    ]);
  });

  it.each([
    ["Stripe no està configurat (503)", reply({ detail: "Stripe is not configured" }, 503),
      "Los ingresos con tarjeta no están disponibles en este momento. Inténtalo más tarde."],
    ["Stripe no pot crear el pagament (400)", reply({ detail: "Stripe could not create the payment intent" }, 400),
      "No se ha podido preparar el pago. Inténtalo de nuevo."],
    ["el backend rebutja l'import (422)", reply({ detail: [{
      type: "greater_than_equal", loc: ["body", "amount_cents"], msg: "Input should be greater than or equal to 50",
      input: 10_000, ctx: { ge: 50 },
    }] }, 422), "El importe no es válido. Revísalo e inténtalo de nuevo."],
    ["falla la xarxa", () => Promise.reject(new TypeError("Failed to fetch")),
      "No se ha podido preparar el pago. Inténtalo de nuevo."],
  ])("si %s es queda a l'import, el conserva i es pot reintentar", async (_case, failure, message) => {
    serve({
      "GET /api/auth/me": SESSION,
      [POST_INTENT]: inOrder(failure, reply(intent(2))),
      "GET /api/me/wallet": reply(wallet(25_000, 5_000)),
    });
    const user = renderDeposit();
    await user.type(amountField(), "100");
    await user.click(continueButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(amountField()).toHaveValue("100,00");
    expect(continueButton()).toBeEnabled();
    expect(screen.queryByRole("heading", { name: "Pago con tarjeta" })).not.toBeInTheDocument();
    expect(stripe.options).toBeNull();

    await user.click(continueButton());
    expect(await screen.findByRole("heading", { name: "Pago con tarjeta" })).toBeInTheDocument();
    expect(stripe.options).toMatchObject({ clientSecret: "pi_2_secret_abc" });
    expect(intentCalls().map(([, init]) => JSON.parse(String(init?.body))))
      .toEqual([{ amount_cents: 10_000 }, { amount_cents: 10_000 }]);
  });

  it("amb la sessió caducada en preparar el pagament acaba al login sense cap missatge d'error", async () => {
    serve({
      "GET /api/auth/me": SESSION,
      [POST_INTENT]: reply({ detail: "Invalid or missing session" }, 401),
      "GET /api/me/wallet": reply({ detail: "Invalid or missing session" }, 401),
    });
    const user = renderDeposit();
    await user.type(amountField(), "100");
    await user.click(continueButton());

    expect(await screen.findByRole("heading", { name: "Inicio de sesión simulado" })).toBeInTheDocument();
    expect(useAuthStore.getState().active_account).toBeNull();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(stripe.options).toBeNull();
  });
});

describe("Ingrés: el pas de pagament i el saldo", () => {
  it("una targeta rebutjada no fa cap petició al backend i deixa tornar-ho a provar", async () => {
    serve({
      "GET /api/auth/me": SESSION,
      [POST_INTENT]: reply(intent(1)),
      "GET /api/me/wallet": reply(wallet(25_000, 5_000)),
    });
    stripe.confirmPayment.mockResolvedValue({
      error: { type: "card_error", code: "card_declined", message: "Tu tarjeta ha sido rechazada." },
    });
    const user = renderDeposit();
    await goToPayment(user);
    await user.click(payButton());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Pago rechazado");
    expect(alert).toHaveTextContent("Tu tarjeta ha sido rechazada. Prueba con otra tarjeta. Tu saldo no ha cambiado.");
    expect(payButton()).toBeEnabled();
    // No s'espera cap ingrés: ni es consulta el saldo ni es prepara un altre pagament.
    expect(requests()).toEqual(["GET /api/auth/me", POST_INTENT, "GET /api/me/wallet"]);
  });

  it("«Volver» conserva l'import i «Continuar al pago» prepara un pagament nou", async () => {
    serve({
      "GET /api/auth/me": SESSION,
      [POST_INTENT]: inOrder(reply(intent(1)), reply(intent(2))),
      "GET /api/me/wallet": reply(wallet(25_000, 5_000)),
    });
    const user = renderDeposit();
    await goToPayment(user);
    expect(stripe.options).toMatchObject({ clientSecret: "pi_1_secret_abc" });

    await user.click(screen.getByRole("button", { name: "Volver" }));
    expect(amountField()).toHaveValue("100,00");
    await user.click(continueButton());

    expect(await screen.findByRole("heading", { name: "Pago con tarjeta" })).toBeInTheDocument();
    expect(stripe.options).toMatchObject({ clientSecret: "pi_2_secret_abc" });
    expect(intentCalls()).toHaveLength(2);
  });

  it("si no s'ha pogut llegir el saldo abans de pagar, no afirma que s'hagi acreditat i deixa actualitzar-lo", async () => {
    serve({
      "GET /api/auth/me": SESSION,
      [POST_INTENT]: reply(intent(1)),
      "GET /api/me/wallet": inOrder(
        // Lectura d'abans de pagar: falla. Després, «Mi saldo» abans i després del webhook.
        () => Promise.resolve(new Response("Internal Server Error", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } })),
        reply(wallet(25_000, 5_000)),
        reply(wallet(35_000, 5_000)),
      ),
    });
    stripe.confirmPayment.mockResolvedValue({ paymentIntent: { status: "succeeded" } });
    const user = renderDeposit();
    await goToPayment(user);
    await user.click(payButton());

    const notice = await screen.findByText("Ingreso realizado");
    expect(notice.closest("[role=status]")).toHaveTextContent(
      "Tu pago de 100,00 € se ha completado. El saldo puede tardar unos instantes en actualizarse.",
    );
    const card = screen.getByRole("region", { name: "Saldo disponible" });
    expect(await within(card).findByText("250,00 €")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Actualizar saldo" }));
    expect(await within(card).findByText("350,00 €")).toBeInTheDocument();
    expect(requests()).toEqual([
      "GET /api/auth/me", POST_INTENT, "GET /api/me/wallet", "GET /api/me/wallet", "GET /api/me/wallet",
    ]);
  });
});
