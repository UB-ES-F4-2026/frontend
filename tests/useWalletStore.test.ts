import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, fintechGet } from "../src/service/api";
import { BALANCE_ERROR, useWalletStore, type WalletBalance } from "../src/store/useWalletStore";

// Conservem ApiError real, però cap test arriba a la xarxa.
vi.mock("../src/service/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/service/api")>(),
  fintechGet: vi.fn(),
}));

const get = vi.mocked(fintechGet);

beforeEach(() => {
  vi.resetAllMocks();
  useWalletStore.getState().reset();
});

describe("useWalletStore aïllat de l’API", () => {
  it("consulta /me/wallet i desa el saldo en cèntims", async () => {
    get.mockResolvedValue({ available_cents: 123456, currency: "eur" });
    const result = await useWalletStore.getState().fetchBalance();
    expect(get).toHaveBeenCalledExactlyOnceWith("/me/wallet", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(result).toEqual({ available_cents: 123456, currency: "eur" });
    expect(useWalletStore.getState()).toMatchObject({ status: "success", details: "", balance: result });
  });

  it("accepta un saldo zero com a resultat vàlid", async () => {
    get.mockResolvedValue({ available_cents: 0, currency: "eur" });
    await useWalletStore.getState().fetchBalance();
    expect(useWalletStore.getState()).toMatchObject({ status: "success", balance: { available_cents: 0 } });
  });

  it.each([
    ["sense import", { currency: "eur" }],
    ["import negatiu", { available_cents: -1, currency: "eur" }],
    ["import amb decimals", { available_cents: 10.5, currency: "eur" }],
    ["import com a text", { available_cents: "100", currency: "eur" }],
    ["import nul", { available_cents: null, currency: "eur" }],
    ["import fora de rang segur", { available_cents: Number.MAX_SAFE_INTEGER + 2, currency: "eur" }],
    ["sense moneda", { available_cents: 100 }],
    ["altra moneda", { available_cents: 100, currency: "usd" }],
    ["cos buit", undefined],
  ])("tracta una resposta %s com a error, mai com a zero", async (_label, body) => {
    get.mockResolvedValue(body);
    expect(await useWalletStore.getState().fetchBalance()).toBeNull();
    expect(useWalletStore.getState()).toMatchObject({ status: "error", details: BALANCE_ERROR, balance: null });
  });

  it.each([
    ["404", new ApiError("Not found", 404, null)],
    ["500", new ApiError("Server error", 500, null)],
    ["xarxa", new TypeError("Failed to fetch")],
  ])("mostra un error genèric sense detalls interns davant un error %s", async (_label, error) => {
    get.mockRejectedValue(error);
    expect(await useWalletStore.getState().fetchBalance()).toBeNull();
    expect(useWalletStore.getState()).toMatchObject({ status: "error", details: BALANCE_ERROR, balance: null });
  });

  it("no mostra l’import anterior mentre torna a consultar i evita peticions duplicades", async () => {
    useWalletStore.setState({ status: "success", balance: { available_cents: 500, currency: "eur" } });
    let resolve!: (value: WalletBalance) => void;
    get.mockReturnValue(new Promise((done) => { resolve = done; }));
    const pending = useWalletStore.getState().fetchBalance();
    expect(useWalletStore.getState()).toMatchObject({ status: "loading", balance: null });
    expect(await useWalletStore.getState().fetchBalance()).toBeNull();
    expect(get).toHaveBeenCalledOnce();
    resolve({ available_cents: 700, currency: "eur" });
    await pending;
    expect(useWalletStore.getState().balance).toEqual({ available_cents: 700, currency: "eur" });
  });

  it("descarta una resposta pendent després de reset (tancar sessió o sortir)", async () => {
    let resolve!: (value: WalletBalance) => void;
    get.mockReturnValue(new Promise((done) => { resolve = done; }));
    const pending = useWalletStore.getState().fetchBalance();
    const signal = get.mock.calls[0][1]?.signal;
    useWalletStore.getState().reset();
    expect(signal?.aborted).toBe(true);
    resolve({ available_cents: 999, currency: "eur" });
    expect(await pending).toBeNull();
    expect(useWalletStore.getState()).toMatchObject({ status: "idle", balance: null });
  });
});
