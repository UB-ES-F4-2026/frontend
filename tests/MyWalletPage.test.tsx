import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyWalletPage from "../src/pages/wallet/MyWalletPage";
import { fintechGet } from "../src/service/api";
import { useAuthStore } from "../src/store/useAuthStore";
import { useWalletStore } from "../src/store/useWalletStore";

// Stores reals i pàgina real; només simulem la crida a l’API.
vi.mock("../src/service/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/service/api")>(),
  fintechGet: vi.fn(),
}));

const get = vi.mocked(fintechGet);
const account = { id: 1, email: "user@example.com", created_at: "2026-10-27T10:00:00Z" };
const balanceRegion = () => screen.getByRole("region", { name: "Saldo disponible" });

beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.setState({ ...useAuthStore.getInitialState(), active_account: account }, true);
  useWalletStore.getState().reset();
});

describe("Mi saldo", () => {
  it("mostra el títol i l’avís de simulació", async () => {
    get.mockResolvedValue({ available_cents: 100, currency: "eur" });
    render(<MyWalletPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Mi saldo" })).toBeInTheDocument();
    expect(screen.getByText("Entorno de simulación. Este saldo no representa dinero real.")).toBeInTheDocument();
    await screen.findByText("1,00 €");
  });

  it("mostra «Cargando saldo…» sense cap import mentre consulta", () => {
    get.mockReturnValue(new Promise(() => {}));
    render(<MyWalletPage />);
    expect(within(balanceRegion()).getByRole("status")).toHaveTextContent("Cargando saldo…");
    expect(within(balanceRegion()).queryByText(/€/)).not.toBeInTheDocument();
  });

  it.each([
    [123456, "1.234,56 €"],
    [1, "0,01 €"],
    [99999999, "999.999,99 €"],
    [900719925474099, "9.007.199.254.740,99 €"],
  ])("formata %i cèntims com «%s» dins del resum «Saldo disponible»", async (cents, text) => {
    get.mockResolvedValue({ available_cents: cents, currency: "eur" });
    render(<MyWalletPage />);
    expect(await within(balanceRegion()).findByText(text)).toBeInTheDocument();
    expect(screen.queryByText(/Tu saldo disponible es de/)).not.toBeInTheDocument();
  });

  it("amb saldo zero mostra l’import i el missatge específic", async () => {
    get.mockResolvedValue({ available_cents: 0, currency: "eur" });
    render(<MyWalletPage />);
    expect(await within(balanceRegion()).findByText("0,00 €")).toBeInTheDocument();
    expect(screen.getByText("Tu saldo disponible es de 0,00 €")).toBeInTheDocument();
  });

  it("davant un error mostra l’alerta i «Reintentar» torna a consultar", async () => {
    get.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<MyWalletPage />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No se ha podido consultar tu saldo");
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();

    get.mockResolvedValueOnce({ available_cents: 2500, currency: "eur" });
    await userEvent.setup().click(within(alert).getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("25,00 €")).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("una resposta invàlida es mostra com a error, no com a 0,00 €", async () => {
    get.mockResolvedValue({ available_cents: -5, currency: "eur" });
    render(<MyWalletPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se ha podido consultar tu saldo");
    expect(screen.queryByText("0,00 €")).not.toBeInTheDocument();
  });

  it("no mostra botons per ingressar, invertir o retirar", async () => {
    get.mockResolvedValue({ available_cents: 100, currency: "eur" });
    render(<MyWalletPage />);
    await screen.findByText("1,00 €");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("en canviar de client retira el saldo anterior i en consulta un de nou", async () => {
    get.mockResolvedValueOnce({ available_cents: 5000, currency: "eur" });
    render(<MyWalletPage />);
    await screen.findByText("50,00 €");

    get.mockReturnValueOnce(new Promise(() => {}));
    act(() => useAuthStore.setState({ active_account: { ...account, id: 2 } }));
    expect(screen.queryByText("50,00 €")).not.toBeInTheDocument();
    expect(screen.getByText("Cargando saldo…")).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("en sortir de la pàgina descarta el saldo", async () => {
    get.mockResolvedValue({ available_cents: 5000, currency: "eur" });
    const { unmount } = render(<MyWalletPage />);
    await screen.findByText("50,00 €");
    unmount();
    expect(useWalletStore.getState()).toMatchObject({ status: "idle", balance: null });
  });
});
