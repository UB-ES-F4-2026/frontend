import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadStripe } from "@stripe/stripe-js";
import WalletDepositPage from "../src/pages/wallet/WalletDepositPage";
import { fintechPost } from "../src/service/api";

// Cap crida real a Stripe ni al backend: simulem la càrrega de Stripe.js, Elements i l'API.
const stripe = vi.hoisted(() => ({
  confirmPayment: vi.fn<(options: unknown) => Promise<unknown>>(),
}));

vi.mock("@stripe/stripe-js", () => ({ loadStripe: vi.fn() }));
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: ReactNode }) => <>{children}</>,
  PaymentElement: () => <div>Formulario de tarjeta de Stripe</div>,
  useStripe: () => stripe,
  useElements: () => ({}),
}));
vi.mock("../src/service/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/service/api")>(),
  fintechPost: vi.fn(),
}));

const load = vi.mocked(loadStripe);
const post = vi.mocked(fintechPost);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/my-balance/deposit"]}>
      <Routes>
        <Route path="/my-balance/deposit" element={<WalletDepositPage />} />
        <Route path="/my-balance" element={<h1>Mi saldo simulado</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("VITE_STRIPE_PUBLISHABLE_KEY", "pk_test_simulada");
  load.mockResolvedValue(null);
  post.mockResolvedValue({ client_secret: "pi_1_secret_2", payment_intent_id: "pi_1" });
});
afterEach(() => vi.unstubAllEnvs());

describe("Ingresar fondos", () => {
  it("mostra el títol, el camp d'import i l'enllaç per tornar al saldo", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Ingresar fondos" })).toBeInTheDocument();
    expect(screen.getByLabelText("Importe a ingresar (€)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a mi saldo" })).toHaveAttribute("href", "/my-balance");
  });

  it("carrega Stripe una sola vegada amb la clau pública, encara que la pàgina es torni a pintar", async () => {
    renderPage();
    await userEvent.setup({ delay: null }).type(screen.getByLabelText("Importe a ingresar (€)"), "123");
    expect(load).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledWith("pk_test_simulada");
  });

  it("sense clau pública no carrega Stripe i avisa en intentar continuar", async () => {
    vi.stubEnv("VITE_STRIPE_PUBLISHABLE_KEY", "");
    renderPage();
    const user = userEvent.setup({ delay: null });
    await user.type(screen.getByLabelText("Importe a ingresar (€)"), "10");
    await user.click(screen.getByRole("button", { name: "Continuar al pago" }));
    expect(load).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("El ingreso con tarjeta no está disponible en este momento.");
    expect(post).not.toHaveBeenCalled();
  });

  it("Cancelar torna a «Mi saldo»", async () => {
    renderPage();
    await userEvent.setup({ delay: null }).click(screen.getByRole("button", { name: "Cancelar" }));
    expect(await screen.findByRole("heading", { name: "Mi saldo simulado" })).toBeInTheDocument();
  });

  it("un pagament correcte (4242 4242 4242 4242) torna a «Mi saldo»", async () => {
    stripe.confirmPayment.mockResolvedValue({ paymentIntent: { id: "pi_1", status: "succeeded" } });
    renderPage();
    const user = userEvent.setup({ delay: null });
    await user.type(screen.getByLabelText("Importe a ingresar (€)"), "50");
    await user.click(screen.getByRole("button", { name: "Continuar al pago" }));
    await user.click(await screen.findByRole("button", { name: /^Pagar 50,00/ }));
    expect(await screen.findByRole("heading", { name: "Mi saldo simulado" })).toBeInTheDocument();
  });

  it("un pagament rebutjat (4000 0000 0000 0002) es queda a la pàgina amb l'error", async () => {
    stripe.confirmPayment.mockResolvedValue({
      error: { type: "card_error", code: "card_declined", decline_code: "generic_decline", message: "Your card was declined." },
    });
    renderPage();
    const user = userEvent.setup({ delay: null });
    await user.type(screen.getByLabelText("Importe a ingresar (€)"), "50");
    await user.click(screen.getByRole("button", { name: "Continuar al pago" }));
    await user.click(await screen.findByRole("button", { name: /^Pagar 50,00/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your card was declined.");
    expect(screen.getByRole("heading", { level: 1, name: "Ingresar fondos" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Mi saldo simulado" })).not.toBeInTheDocument();
  });
});
