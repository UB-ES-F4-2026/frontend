import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, fintechGet, fintechPost } from "../src/service/api";
import {
  BALANCE_ERROR,
  DEPOSIT_POLL_ATTEMPTS,
  DEPOSIT_POLL_INTERVAL_MS,
  DEPOSIT_UNAVAILABLE,
  useWalletStore,
  type WalletBalance,
} from "../src/store/useWalletStore";

// Conservem ApiError real, però cap test arriba a la xarxa.
vi.mock("../src/service/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/service/api")>(),
  fintechGet: vi.fn(),
  fintechPost: vi.fn(),
}));

const get = vi.mocked(fintechGet);
const post = vi.mocked(fintechPost);
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

describe("useWalletStore: ingrés amb Stripe (US04.2)", () => {
  const intent = { client_secret: "pi_123_secret_abc", payment_intent_id: "pi_123" };
  // Temps total que l'store espera el webhook abans de rendir-se.
  const FULL_WAIT = DEPOSIT_POLL_INTERVAL_MS * DEPOSIT_POLL_ATTEMPTS;

  afterEach(() => {
    vi.useRealTimers();
  });

  // Prepara un ingrés de 100,00 € amb 250,00 € disponibles i 50,00 € compromesos (300,00 € en total).
  const prepare = async (amountCents = 10000) => {
    post.mockResolvedValueOnce(intent);
    get.mockResolvedValueOnce(wallet(25000, 5000));
    return useWalletStore.getState().createDepositIntent(amountCents);
  };

  it("crea el pagament amb l'import en cèntims i retorna el client_secret", async () => {
    expect(await prepare()).toEqual(intent);
    expect(post).toHaveBeenCalledExactlyOnceWith("/me/wallet/deposit-intent", { amount_cents: 10000 });
    expect(get).toHaveBeenCalledExactlyOnceWith("/me/wallet", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(useWalletStore.getState()).toMatchObject({ depositStatus: "success", depositDetails: "" });
  });

  it("no toca el saldo que es mostra en llegir-lo abans de pagar", async () => {
    await prepare();
    expect(useWalletStore.getState()).toMatchObject({ status: "idle", balance: null });
  });

  it("evita crear dos pagaments amb un doble clic", async () => {
    let resolve!: (value: unknown) => void;
    post.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    get.mockResolvedValue(wallet(0, 0));
    const first = useWalletStore.getState().createDepositIntent(10000);
    expect(useWalletStore.getState().depositStatus).toBe("loading");
    expect(await useWalletStore.getState().createDepositIntent(10000)).toBeNull();
    resolve(intent);
    expect(await first).toEqual(intent);
    expect(post).toHaveBeenCalledOnce();
  });

  it.each([
    ["401 (SessionManager porta al login)", new ApiError("Invalid or missing session", 401, null), ""],
    ["422", new ApiError("HTTP Error 422", 422, { detail: [] }), "El importe no es válido. Revísalo e inténtalo de nuevo."],
    ["503 (Stripe sense configurar)", new ApiError("Stripe is not configured", 503, null), DEPOSIT_UNAVAILABLE],
    ["400 (Stripe ha fallat)", new ApiError("Stripe could not create the payment intent", 400, null), "No se ha podido preparar el pago. Inténtalo de nuevo."],
    ["500", new ApiError("Server error", 500, null), "No se ha podido preparar el pago. Inténtalo de nuevo."],
    ["de xarxa", new TypeError("Failed to fetch"), "No se ha podido preparar el pago. Inténtalo de nuevo."],
  ])("tradueix un error %s sense mostrar detalls interns", async (_label, error, message) => {
    post.mockRejectedValueOnce(error);
    get.mockResolvedValue(wallet(0, 0));
    expect(await useWalletStore.getState().createDepositIntent(10000)).toBeNull();
    expect(useWalletStore.getState()).toMatchObject({ depositStatus: "error", depositDetails: message });
  });

  it("una resposta sense client_secret és un error", async () => {
    post.mockResolvedValueOnce({ payment_intent_id: "pi_123" });
    get.mockResolvedValue(wallet(0, 0));
    expect(await useWalletStore.getState().createDepositIntent(10000)).toBeNull();
    expect(useWalletStore.getState()).toMatchObject({
      depositStatus: "error",
      depositDetails: "No se ha podido preparar el pago. Inténtalo de nuevo.",
    });
  });

  it("després de pagar espera que el saldo inclogui l'ingrés i ho anuncia a «Mi saldo»", async () => {
    await prepare();
    vi.useFakeTimers();
    // El primer cop el webhook encara no ha arribat; el segon, sí.
    get.mockResolvedValueOnce(wallet(25000, 5000)).mockResolvedValueOnce(wallet(35000, 5000));
    const done = useWalletStore.getState().completeDeposit();
    await vi.advanceTimersByTimeAsync(DEPOSIT_POLL_INTERVAL_MS * 2);
    expect(await done).toEqual({ amount_cents: 10000, reflected: true });
    expect(get).toHaveBeenCalledTimes(3);
    expect(useWalletStore.getState().lastDeposit).toEqual({ amount_cents: 10000, reflected: true });
  });

  it("compara el saldo total: una aportació feta mentrestant no amaga l'ingrés", async () => {
    await prepare();
    vi.useFakeTimers();
    // +100,00 € de l'ingrés i 30,00 € passats del disponible al compromès: total 400,00 €.
    get.mockResolvedValueOnce(wallet(32000, 8000));
    const done = useWalletStore.getState().completeDeposit();
    await vi.advanceTimersByTimeAsync(DEPOSIT_POLL_INTERVAL_MS);
    expect(await done).toEqual({ amount_cents: 10000, reflected: true });
  });

  it("si el saldo no canvia en deu segons, ho anuncia igualment com a pendent de reflectir", async () => {
    await prepare();
    vi.useFakeTimers();
    get.mockResolvedValue(wallet(25000, 5000));
    const done = useWalletStore.getState().completeDeposit();
    await vi.advanceTimersByTimeAsync(FULL_WAIT);
    expect(await done).toEqual({ amount_cents: 10000, reflected: false });
    expect(get).toHaveBeenCalledTimes(1 + DEPOSIT_POLL_ATTEMPTS);
  });

  it("si no s'ha pogut llegir el saldo abans de pagar, no espera", async () => {
    post.mockResolvedValueOnce(intent);
    get.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    expect(await useWalletStore.getState().createDepositIntent(10000)).toEqual(intent);
    expect(await useWalletStore.getState().completeDeposit()).toEqual({ amount_cents: 10000, reflected: false });
    expect(get).toHaveBeenCalledOnce();
  });

  it("una consulta fallida durant l'espera es torna a provar", async () => {
    await prepare();
    vi.useFakeTimers();
    get.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(wallet(35000, 5000));
    const done = useWalletStore.getState().completeDeposit();
    await vi.advanceTimersByTimeAsync(DEPOSIT_POLL_INTERVAL_MS * 2);
    expect(await done).toEqual({ amount_cents: 10000, reflected: true });
  });

  it("sortir de la pàgina mentre s'espera atura l'espera sense anunciar res", async () => {
    await prepare();
    vi.useFakeTimers();
    get.mockResolvedValue(wallet(25000, 5000));
    const done = useWalletStore.getState().completeDeposit();
    await vi.advanceTimersByTimeAsync(DEPOSIT_POLL_INTERVAL_MS);
    useWalletStore.getState().resetDeposit();
    await vi.advanceTimersByTimeAsync(FULL_WAIT);
    expect(await done).toBeNull();
    expect(useWalletStore.getState().lastDeposit).toBeNull();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("sense cap pagament preparat no hi ha res a completar", async () => {
    expect(await useWalletStore.getState().completeDeposit()).toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it("resetDeposit esborra l'error però conserva l'ingrés que ha d'anunciar «Mi saldo»", () => {
    useWalletStore.setState({ depositStatus: "error", depositDetails: "Error", lastDeposit: { amount_cents: 100, reflected: true } });
    useWalletStore.getState().resetDeposit();
    expect(useWalletStore.getState()).toMatchObject({
      depositStatus: "idle",
      depositDetails: "",
      lastDeposit: { amount_cents: 100, reflected: true },
    });
  });

  it("reset (sortir de «Mi saldo» o tancar la sessió) esborra l'avís de l'ingrés", () => {
    useWalletStore.setState({ lastDeposit: { amount_cents: 100, reflected: true } });
    useWalletStore.getState().reset();
    expect(useWalletStore.getState().lastDeposit).toBeNull();
  });
});
