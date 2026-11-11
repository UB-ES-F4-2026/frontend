import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WalletDepositForm from "../src/pages/wallet/WalletDepositForm";
import { ApiError, fintechPost } from "../src/service/api";

// Resultat de `stripe.confirmPayment` amb `redirect: "if_required"`: o un error, o el PaymentIntent.
type ConfirmResult = {
  error?: { type: string; code?: string; decline_code?: string; message?: string };
  paymentIntent?: { id: string; status: string };
};

// El PaymentElement real és un iframe de Stripe que no funciona a jsdom: simulem el mòdul
// i controlem què retorna `confirmPayment`, com faria Stripe amb cada targeta de prova.
const stripe = vi.hoisted(() => ({
  instance: null as { confirmPayment: (options: unknown) => Promise<unknown> } | null,
  confirmPayment: vi.fn<(options: unknown) => Promise<unknown>>(),
  elementsOptions: [] as unknown[],
}));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children, options }: { children: ReactNode; options: unknown }) => {
    stripe.elementsOptions.push(options);
    return <>{children}</>;
  },
  PaymentElement: () => <div>Formulario de tarjeta de Stripe</div>,
  useStripe: () => stripe.instance,
  useElements: () => (stripe.instance ? { simulated: "elements" } : null),
}));

vi.mock("../src/service/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/service/api")>(),
  fintechPost: vi.fn(),
}));

const post = vi.mocked(fintechPost);
const intent = { client_secret: "pi_123_secret_456", payment_intent_id: "pi_123" };
const onCancel = vi.fn();
const onSuccess = vi.fn<(amountCents: number) => void | Promise<void>>();

const amountInput = () => screen.getByLabelText("Importe a ingresar (€)");
// Intl separa l'import i «€» amb un espai no separable, que el nom accessible conserva.
const payButton = (amount: string) => ({ name: `Pagar ${amount.replace(" €", "\u00a0€")}` });
const continueButton = () => screen.getByRole("button", { name: /Continuar al pago|Preparando pago…/ });

function renderForm(stripePromise: Promise<never> | null = Promise.resolve(null as never)) {
  return render(<WalletDepositForm stripePromise={stripePromise} onCancel={onCancel} onSuccess={onSuccess} />);
}

// Arriba a la pantalla de pagament amb l'import indicat.
async function goToPayment(user: ReturnType<typeof userEvent.setup>, amount = "10") {
  await user.type(amountInput(), amount);
  await user.click(continueButton());
  return screen.findByRole("button", { name: /^Pagar / });
}

beforeEach(() => {
  vi.resetAllMocks();
  stripe.instance = { confirmPayment: stripe.confirmPayment };
  stripe.elementsOptions = [];
  post.mockResolvedValue(intent);
});

describe("Ingrés: import", () => {
  it("mostra el camp amb etiqueta, el mínim i les accions", () => {
    renderForm();
    expect(amountInput()).toHaveAttribute("min", "0.50");
    expect(amountInput()).toBeRequired();
    expect(screen.getByText("Importe mínimo: 0,50 €")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(continueButton()).toBeEnabled();
  });

  it.each([
    ["0.50", 50],
    ["1", 100],
    ["19.99", 1999],
    ["4.35", 435],
    ["1234.56", 123456],
  ])("converteix %s € en %i cèntims sense errors de coma flotant", async (amount, cents) => {
    renderForm();
    await userEvent.setup({ delay: null }).type(amountInput(), amount);
    await userEvent.setup({ delay: null }).click(continueButton());
    await waitFor(() => expect(post).toHaveBeenCalledWith("/me/wallet/deposit-intent", { amount_cents: cents }));
  });

  it.each(["0.49", "0.01", "0"])("no crea cap intent de pagament per sota del mínim: %s €", async (amount) => {
    renderForm();
    const user = userEvent.setup({ delay: null });
    await user.type(amountInput(), amount);
    await user.click(continueButton());
    expect(post).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /^Pagar / })).not.toBeInTheDocument();
  });

  it.each([
    ["buit", ""],
    ["amb tres decimals", "10.005"],
    ["negatiu", "-5"],
  ])("no crea cap intent de pagament amb un import %s", async (_case, amount) => {
    renderForm();
    const user = userEvent.setup({ delay: null });
    if (amount) await user.type(amountInput(), amount);
    await user.click(continueButton());
    expect(post).not.toHaveBeenCalled();
  });

  it("bloqueja el botó mentre prepara el pagament i no duplica la petició", async () => {
    post.mockReturnValue(new Promise(() => {}));
    renderForm();
    const user = userEvent.setup({ delay: null });
    await user.type(amountInput(), "10");
    await user.dblClick(continueButton());
    expect(screen.getByRole("button", { name: "Preparando pago…" })).toBeDisabled();
    expect(post).toHaveBeenCalledOnce();
  });

  it.each([
    ["un 400 de Stripe", new ApiError("No se pudo crear el intento de pago.", 400, null)],
    ["un 500 sense clau", new ApiError("La clave secreta de Stripe no está configurada", 500, null)],
    ["un error de xarxa", new TypeError("Failed to fetch")],
  ])("davant %s mostra un error genèric, conserva l'import i permet reintentar", async (_case, failure) => {
    post.mockRejectedValueOnce(failure);
    renderForm();
    const user = userEvent.setup({ delay: null });
    await user.type(amountInput(), "25");
    await user.click(continueButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("No se ha podido iniciar el ingreso. Inténtalo de nuevo.");
    // Mai no mostrem el detall intern del servidor.
    expect(screen.getByRole("alert")).not.toHaveTextContent(/clave secreta/);
    expect(amountInput()).toHaveValue(25);
    expect(continueButton()).toBeEnabled();

    await user.click(continueButton());
    expect(await screen.findByRole("button", payButton("25,00 €"))).toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("sense clau pública de Stripe avisa que no està disponible i no crida l'API", async () => {
    renderForm(null);
    const user = userEvent.setup({ delay: null });
    await user.type(amountInput(), "10");
    await user.click(continueButton());
    expect(screen.getByRole("alert")).toHaveTextContent("El ingreso con tarjeta no está disponible en este momento.");
    expect(post).not.toHaveBeenCalled();
  });

  it("Cancelar avisa la pàgina sense crear cap pagament", async () => {
    renderForm();
    await userEvent.setup({ delay: null }).click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(post).not.toHaveBeenCalled();
  });
});

describe("Ingrés: pantalla de pagament", () => {
  it("passa el client_secret a Stripe i mostra l'import formatat al botó", async () => {
    renderForm();
    const pay = await goToPayment(userEvent.setup({ delay: null }), "1234.56");
    expect(pay).toHaveTextContent("Pagar 1.234,56 €");
    expect(screen.getByText("Formulario de tarjeta de Stripe")).toBeInTheDocument();
    expect(stripe.elementsOptions.at(-1)).toMatchObject({ clientSecret: intent.client_secret });
    expect(screen.queryByLabelText("Importe a ingresar (€)")).not.toBeInTheDocument();
  });

  it("no permet pagar mentre Stripe no s'ha carregat", async () => {
    stripe.instance = null;
    renderForm();
    const pay = await goToPayment(userEvent.setup({ delay: null }));
    expect(pay).toBeDisabled();
  });

  it("confirma amb Stripe sense redirigir si no cal i amb retorn a «Mi saldo» si cal", async () => {
    stripe.confirmPayment.mockResolvedValue({ paymentIntent: { id: "pi_123", status: "succeeded" } });
    renderForm();
    const user = userEvent.setup({ delay: null });
    await user.click(await goToPayment(user));
    expect(stripe.confirmPayment).toHaveBeenCalledWith({
      elements: { simulated: "elements" },
      confirmParams: { return_url: `${window.location.origin}/my-balance` },
      redirect: "if_required",
    });
  });

  it("bloqueja «Pagar» i «Volver» mentre confirma i no confirma dues vegades", async () => {
    stripe.confirmPayment.mockReturnValue(new Promise(() => {}));
    renderForm();
    const user = userEvent.setup({ delay: null });
    await user.dblClick(await goToPayment(user));
    expect(screen.getByRole("button", { name: "Procesando…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Volver" })).toBeDisabled();
    expect(stripe.confirmPayment).toHaveBeenCalledOnce();
  });

  it("«Volver» torna a l'import conservant-lo; continuar crea un intent nou", async () => {
    renderForm();
    const user = userEvent.setup({ delay: null });
    await goToPayment(user, "15");
    await user.click(screen.getByRole("button", { name: "Volver" }));
    expect(amountInput()).toHaveValue(15);
    await user.click(continueButton());
    expect(await screen.findByRole("button", payButton("15,00 €"))).toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(2);
  });
});

// Targetes de prova recomanades per Stripe (https://docs.stripe.com/testing) i la resposta que
// dona `confirmPayment` per a cadascuna. Per provar-les de debò cal l'entorn complet al navegador.
const declinedCards: [string, string, ConfirmResult["error"]][] = [
  ["4000 0000 0000 0002", "rebutjada (generic_decline)",
    { type: "card_error", code: "card_declined", decline_code: "generic_decline", message: "Your card was declined." }],
  ["4000 0000 0000 9995", "sense fons (insufficient_funds)",
    { type: "card_error", code: "card_declined", decline_code: "insufficient_funds", message: "Your card has insufficient funds." }],
  ["4000 0000 0000 9987", "perduda (lost_card)",
    { type: "card_error", code: "card_declined", decline_code: "lost_card", message: "Your card was declined." }],
  ["4000 0000 0000 0069", "caducada (expired_card)",
    { type: "card_error", code: "expired_card", message: "Your card has expired." }],
  ["4000 0000 0000 0127", "amb CVC incorrecte (incorrect_cvc)",
    { type: "card_error", code: "incorrect_cvc", message: "Your card's security code is incorrect." }],
  ["4000 0000 0000 0119", "amb error de processament (processing_error)",
    { type: "card_error", code: "processing_error", message: "An error occurred while processing your card. Try again in a little bit." }],
  ["4000 0027 6000 3184", "amb 3D Secure fallit",
    { type: "card_error", code: "payment_intent_authentication_failure",
      message: "We are unable to authenticate your payment method. Please choose a different payment method and try again." }],
  ["número incomplet", "amb dades incompletes al formulari de Stripe",
    { type: "validation_error", code: "incomplete_number", message: "Your card number is incomplete." }],
];

describe("Ingrés: targetes de prova de Stripe (simulades)", () => {
  it.each([
    ["4242 4242 4242 4242", "Visa correcta"],
    ["5555 5555 5555 4444", "Mastercard correcta"],
    ["4000 0025 0000 3155", "amb 3D Secure superat"],
  ])("%s (%s): avisa la pàgina amb l'import en cèntims", async () => {
    stripe.confirmPayment.mockResolvedValue({ paymentIntent: { id: "pi_123", status: "succeeded" } });
    renderForm();
    const user = userEvent.setup({ delay: null });
    await user.click(await goToPayment(user, "20.50"));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(2050));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each(declinedCards)("%s, targeta %s: mostra el missatge de Stripe i permet tornar-ho a provar", async (_card, _case, error) => {
    stripe.confirmPayment.mockResolvedValueOnce({ error });
    renderForm();
    const user = userEvent.setup({ delay: null });
    const pay = await goToPayment(user, "20.50");
    await user.click(pay);

    expect(await screen.findByRole("alert")).toHaveTextContent(error!.message!);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole("button", payButton("20,50 €"))).toBeEnabled();

    // Amb una altra targeta (4242…) el mateix intent es pot completar sense tornar a crear-lo.
    stripe.confirmPayment.mockResolvedValueOnce({ paymentIntent: { id: "pi_123", status: "succeeded" } });
    await user.click(screen.getByRole("button", payButton("20,50 €")));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(2050));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(post).toHaveBeenCalledOnce();
  });

  it("un error de Stripe sense missatge mostra un text genèric", async () => {
    stripe.confirmPayment.mockResolvedValue({ error: { type: "api_error" } });
    renderForm();
    const user = userEvent.setup({ delay: null });
    await user.click(await goToPayment(user));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo confirmar el pago.");
  });

  it.each(["processing", "requires_action", "requires_payment_method"])(
    "un pagament en estat %s no es dona per fet",
    async (status) => {
      stripe.confirmPayment.mockResolvedValue({ paymentIntent: { id: "pi_123", status } });
      renderForm();
      const user = userEvent.setup({ delay: null });
      await user.click(await goToPayment(user));
      expect(await screen.findByRole("alert")).toHaveTextContent("El pago todavía no se ha completado.");
      expect(onSuccess).not.toHaveBeenCalled();
    },
  );

  it("si Stripe falla (xarxa) mostra un error i torna a habilitar el pagament", async () => {
    stripe.confirmPayment.mockRejectedValue(new TypeError("Failed to fetch"));
    renderForm();
    const user = userEvent.setup({ delay: null });
    await user.click(await goToPayment(user));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo confirmar el pago. Inténtalo de nuevo.");
    expect(screen.getByRole("button", payButton("10,00 €"))).toBeEnabled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
