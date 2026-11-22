import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, fintechGet } from "../src/service/api";
import { BALANCE_ERROR, useWalletStore, type WalletBalance } from "../src/store/useWalletStore";

// Conservem ApiError real, però cap test arriba a la xarxa.
vi.mock("../src/service/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/service/api")>(),
  fintechGet: vi.fn(),
}));

const get = vi.mocked(fintechGet);
// Cos de BalanceRead tal com l'envia el backend.
const wallet = (available_cents: unknown, committed_cents: unknown = 0): Record<string, unknown> =>
  ({ available_cents, committed_cents, currency: "eur" });

beforeEach(() => {
  vi.resetAllMocks();
  useWalletStore.getState().reset();
});

describe("useWalletStore aïllat de l’API", () => {
  it("consulta /me/wallet i desa el saldo disponible i el compromès en cèntims", async () => {
    get.mockResolvedValue(wallet(123456, 10000));
    const result = await useWalletStore.getState().fetchBalance();
    expect(get).toHaveBeenCalledExactlyOnceWith("/me/wallet", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(result).toEqual({ available_cents: 123456, committed_cents: 10000, currency: "eur" });
    expect(useWalletStore.getState()).toMatchObject({ status: "success", details: "", balance: result });
  });

  it("accepta saldos zero com a resultat vàlid", async () => {
    get.mockResolvedValue(wallet(0, 0));
    await useWalletStore.getState().fetchBalance();
    expect(useWalletStore.getState()).toMatchObject({ status: "success", balance: { available_cents: 0, committed_cents: 0 } });
  });

  it.each([
    ["sense import disponible", { committed_cents: 0, currency: "eur" }],
    ["sense import compromès", { available_cents: 100, currency: "eur" }],
    ["import disponible negatiu", wallet(-1)],
    ["import compromès negatiu", wallet(100, -1)],
    ["import amb decimals", wallet(10.5)],
    ["compromès amb decimals", wallet(100, 0.5)],
    ["import com a text", wallet("100")],
    ["compromès com a text", wallet(100, "0")],
    ["import nul", wallet(null)],
    ["compromès nul", wallet(100, null)],
    ["import fora de rang segur", wallet(Number.MAX_SAFE_INTEGER + 2)],
    ["compromès fora de rang segur", wallet(100, Number.MAX_SAFE_INTEGER + 2)],
    ["sense moneda", { available_cents: 100, committed_cents: 0 }],
    ["altra moneda", { available_cents: 100, committed_cents: 0, currency: "usd" }],
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
    useWalletStore.setState({ status: "success", balance: { available_cents: 500, committed_cents: 0, currency: "eur" } });
    let resolve!: (value: WalletBalance) => void;
    get.mockReturnValue(new Promise((done) => { resolve = done; }));
    const pending = useWalletStore.getState().fetchBalance();
    expect(useWalletStore.getState()).toMatchObject({ status: "loading", balance: null });
    expect(await useWalletStore.getState().fetchBalance()).toBeNull();
    expect(get).toHaveBeenCalledOnce();
    resolve({ available_cents: 700, committed_cents: 300, currency: "eur" });
    await pending;
    expect(useWalletStore.getState().balance).toEqual({ available_cents: 700, committed_cents: 300, currency: "eur" });
  });

  it("descarta una resposta pendent després de reset (tancar sessió o sortir)", async () => {
    let resolve!: (value: WalletBalance) => void;
    get.mockReturnValue(new Promise((done) => { resolve = done; }));
    const pending = useWalletStore.getState().fetchBalance();
    const signal = get.mock.calls[0][1]?.signal;
    useWalletStore.getState().reset();
    expect(signal?.aborted).toBe(true);
    resolve({ available_cents: 999, committed_cents: 1, currency: "eur" });
    expect(await pending).toBeNull();
    expect(useWalletStore.getState()).toMatchObject({ status: "idle", balance: null });
  });
});

describe("useWalletStore després d'una aportació o inversió", () => {
  it("aplica el saldo retornat pel compromís sense tornar a consultar l'API", () => {
    useWalletStore.setState({ status: "success", balance: { available_cents: 25000, committed_cents: 0, currency: "eur" } });
    // `wallet` de CommitmentResultRead: el disponible baixa i el compromès puja el mateix import.
    const result = useWalletStore.getState().applyBalance(wallet(15000, 10000));
    expect(result).toEqual({ available_cents: 15000, committed_cents: 10000, currency: "eur" });
    expect(useWalletStore.getState()).toMatchObject({ status: "success", details: "", balance: result });
    expect(get).not.toHaveBeenCalled();
  });

  it("descarta una consulta anterior que acabi després de l'aportació", async () => {
    let resolve!: (value: unknown) => void;
    get.mockReturnValue(new Promise((done) => { resolve = done; }));
    const pending = useWalletStore.getState().fetchBalance();
    const signal = get.mock.calls[0][1]?.signal;

    useWalletStore.getState().applyBalance(wallet(15000, 10000));
    expect(signal?.aborted).toBe(true);
    // La resposta antiga (d'abans de comprometre) no substitueix la nova.
    resolve(wallet(25000, 0));
    expect(await pending).toBeNull();
    expect(useWalletStore.getState().balance).toEqual({ available_cents: 15000, committed_cents: 10000, currency: "eur" });
  });

  it("permet tornar a consultar després d'aplicar un saldo", async () => {
    useWalletStore.getState().applyBalance(wallet(15000, 10000));
    get.mockResolvedValue(wallet(14000, 11000));
    expect(await useWalletStore.getState().fetchBalance()).toEqual({ available_cents: 14000, committed_cents: 11000, currency: "eur" });
  });

  it.each([
    ["sense compromès", { available_cents: 100, currency: "eur" }],
    ["amb imports negatius", wallet(-1, 5)],
    ["buit", null],
  ])("ignora un saldo %s i conserva l'estat actual", (_label, body) => {
    const current = { available_cents: 500, committed_cents: 200, currency: "eur" as const };
    useWalletStore.setState({ status: "success", balance: current });
    expect(useWalletStore.getState().applyBalance(body)).toBeNull();
    expect(useWalletStore.getState()).toMatchObject({ status: "success", balance: current });
  });
});