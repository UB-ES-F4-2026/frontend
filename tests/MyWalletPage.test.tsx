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
// Cos de BalanceRead. Per defecte 100,00 € compromesos: així el total no coincideix amb el disponible.
const wallet = (available_cents: number, committed_cents = 10000) => ({ available_cents, committed_cents, currency: "eur" });
const balanceRegion = () => screen.getByRole("region", { name: "Saldo disponible" });

beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.setState({ ...useAuthStore.getInitialState(), active_account: account }, true);
  useWalletStore.getState().reset();
});

describe("Mi saldo", () => {
  it("mostra el títol i l’avís de simulació", async () => {
    get.mockResolvedValue(wallet(100));
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
    get.mockResolvedValue(wallet(cents));
    render(<MyWalletPage />);
    expect(await within(balanceRegion()).findByText(text)).toBeInTheDocument();
    expect(screen.queryByText(/Tu saldo disponible es de/)).not.toBeInTheDocument();
  });

  it("amb saldo zero mostra l’import i el missatge específic", async () => {
    get.mockResolvedValue(wallet(0));
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

    get.mockResolvedValueOnce(wallet(2500));
    await userEvent.setup().click(within(alert).getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("25,00 €")).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("una resposta invàlida es mostra com a error, no com a 0,00 €", async () => {
    get.mockResolvedValue(wallet(-5));
    render(<MyWalletPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se ha podido consultar tu saldo");
    expect(screen.queryByText("0,00 €")).not.toBeInTheDocument();
  });

  it("no mostra botons per ingressar, invertir o retirar", async () => {
    get.mockResolvedValue(wallet(100));
    render(<MyWalletPage />);
    await screen.findByText("1,00 €");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("en canviar de client retira el saldo anterior i en consulta un de nou", async () => {
    get.mockResolvedValueOnce(wallet(5000));
    render(<MyWalletPage />);
    await screen.findByText("50,00 €");

    get.mockReturnValueOnce(new Promise(() => {}));
    act(() => useAuthStore.setState({ active_account: { ...account, id: 2 } }));
    expect(screen.queryByText("50,00 €")).not.toBeInTheDocument();
    expect(screen.getByText("Cargando saldo…")).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("en sortir de la pàgina descarta el saldo", async () => {
    get.mockResolvedValue(wallet(5000));
    const { unmount } = render(<MyWalletPage />);
    await screen.findByText("50,00 €");
    unmount();
    expect(useWalletStore.getState()).toMatchObject({ status: "idle", balance: null });
  });
});

describe("Mi saldo: saldo comprometido", () => {
  // Valor que acompanya cada etiqueta de la llista de resum.
  const amountOf = (label: string) => within(balanceRegion()).getByText(label).nextElementSibling;

  it("mostra separadament el disponible, el comprometido i el total (mockup: 150 + 100 = 250)", async () => {
    get.mockResolvedValue(wallet(15000, 10000));
    render(<MyWalletPage />);
    expect(await within(balanceRegion()).findByText("150,00 €")).toBeInTheDocument();
    expect(amountOf("Saldo comprometido")).toHaveTextContent("100,00 €");
    expect(amountOf("Total")).toHaveTextContent("250,00 €");
    expect(within(balanceRegion()).getAllByRole("term").map((term) => term.textContent)).toEqual(["Saldo comprometido", "Total"]);
  });

  it("no suma el saldo comprometido al disponible", async () => {
    get.mockResolvedValue(wallet(0, 10000));
    render(<MyWalletPage />);
    expect(await screen.findByText("Tu saldo disponible es de 0,00 €")).toBeInTheDocument();
    expect(amountOf("Saldo comprometido")).toHaveTextContent("100,00 €");
    expect(amountOf("Total")).toHaveTextContent("100,00 €");
  });

  it("mostra 0,00 € de comprometido quan no hi ha reserves", async () => {
    get.mockResolvedValue(wallet(5000, 0));
    render(<MyWalletPage />);
    await within(balanceRegion()).findByText("Saldo comprometido");
    expect(amountOf("Saldo comprometido")).toHaveTextContent("0,00 €");
    expect(amountOf("Total")).toHaveTextContent("50,00 €");
  });

  it("calcula el total exacte encara que superi l'enter segur de JavaScript", async () => {
    get.mockResolvedValue(wallet(Number.MAX_SAFE_INTEGER, 1));
    render(<MyWalletPage />);
    await within(balanceRegion()).findByText("Total");
    expect(amountOf("Total")).toHaveTextContent("90.071.992.547.409,92 €");
  });

  it("no mostra el comprometido ni el total mentre consulta ni davant un error", async () => {
    get.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<MyWalletPage />);
    expect(screen.queryByText("Saldo comprometido")).not.toBeInTheDocument();
    await screen.findByRole("alert");
    expect(screen.queryByText("Saldo comprometido")).not.toBeInTheDocument();
    expect(screen.queryByText("Total")).not.toBeInTheDocument();
  });

  it("una resposta sense saldo comprometido es mostra com a error", async () => {
    get.mockResolvedValue({ available_cents: 5000, currency: "eur" });
    render(<MyWalletPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se ha podido consultar tu saldo");
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
  });

  it("s'actualitza després d'una aportació correcta sense tornar a consultar", async () => {
    get.mockResolvedValue(wallet(25000, 0));
    render(<MyWalletPage />);
    await within(balanceRegion()).findByText("Saldo comprometido");

    // Saldo que retorna POST /opportunities/{id}/commitments en comprometre 100 €.
    act(() => { useWalletStore.getState().applyBalance(wallet(15000, 10000)); });
    expect(within(balanceRegion()).getByText("150,00 €")).toBeInTheDocument();
    expect(amountOf("Saldo comprometido")).toHaveTextContent("100,00 €");
    expect(amountOf("Total")).toHaveTextContent("250,00 €");
    expect(get).toHaveBeenCalledOnce();
  });

  it("torna a consultar els dos saldos cada vegada que s'entra a la pàgina", async () => {
    get.mockResolvedValueOnce(wallet(25000, 0)).mockResolvedValueOnce(wallet(15000, 10000));
    const { unmount } = render(<MyWalletPage />);
    await within(balanceRegion()).findByText("Saldo comprometido");
    unmount();

    render(<MyWalletPage />);
    expect(await within(balanceRegion()).findByText("150,00 €")).toBeInTheDocument();
    expect(amountOf("Saldo comprometido")).toHaveTextContent("100,00 €");
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("en tancar la sessió esborra els dos saldos", async () => {
    get.mockResolvedValue(wallet(15000, 10000));
    render(<MyWalletPage />);
    await within(balanceRegion()).findByText("150,00 €");

    act(() => useAuthStore.getState().clearSession());
    expect(useWalletStore.getState()).toMatchObject({ status: "idle", balance: null });
    expect(screen.queryByText("100,00 €")).not.toBeInTheDocument();
    expect(screen.queryByText("Saldo comprometido")).not.toBeInTheDocument();
    expect(get).toHaveBeenCalledOnce();
  });
});