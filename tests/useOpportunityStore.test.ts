import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, fintechGet, fintechPost } from "../src/service/api";
import {
  useOpportunityStore,
  type BusinessOpportunityGetResponse,
  type CommitmentResult,
  type RealEstateOpportunityGetResponse,
} from "../src/store/useOpportunityStore";
import { useWalletStore } from "../src/store/useWalletStore";

// Conservem ApiError real, però cap test arriba a la xarxa.
vi.mock("../src/service/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/service/api")>(),
  fintechGet: vi.fn(),
  fintechPost: vi.fn(),
}));

const get = vi.mocked(fintechGet);
const post = vi.mocked(fintechPost);

// Només els camps que fa servir el compromís; la resta no hi intervé.
const detail = {
  id: 7,
  title: "Piso en Girona",
  target_amount_cents: 72_000_00,
  committed_cents: 45_000_00,
  minimum_contribution_cents: 100_00,
} as RealEstateOpportunityGetResponse;

const startingBalance = { available_cents: 250_00, committed_cents: 0, currency: "eur" as const };

const result = (overrides: Partial<CommitmentResult> = {}): CommitmentResult => ({
  commitment: { id: 1, opportunity_id: 7, amount_cents: 100_00, created_at: "2026-11-20T10:00:00Z" },
  opportunity: { id: 7, target_amount_cents: 72_000_00, committed_cents: 45_100_00 },
  wallet: { available_cents: 150_00, committed_cents: 100_00, currency: "eur" },
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
  useOpportunityStore.setState(useOpportunityStore.getInitialState(), true);
  useOpportunityStore.setState({ detailStatus: "success", detailId: 7, realEstateOpportunity: detail });
  useWalletStore.getState().reset();
  useWalletStore.setState({ status: "success", balance: startingBalance });
});

describe("useOpportunityStore: comprometre una aportació", () => {
  it("envia l'import en cèntims i actualitza el capital de l'oportunitat i el saldo", async () => {
    post.mockResolvedValue(result());
    const outcome = await useOpportunityStore.getState().commitContribution(7, 100_00);

    expect(post).toHaveBeenCalledExactlyOnceWith("/opportunities/7/commitments", { amount_cents: 100_00 });
    expect(outcome).toEqual({ amount_cents: 100_00, available_cents: 150_00, estimated_equity: null });
    expect(useOpportunityStore.getState()).toMatchObject({
      commitStatus: "success",
      commitError: null,
      realEstateOpportunity: { ...detail, committed_cents: 45_100_00 },
    });
    expect(useWalletStore.getState().balance).toEqual({ available_cents: 150_00, committed_cents: 100_00, currency: "eur" });
    expect(get).not.toHaveBeenCalled();
  });

  it("no toca el detall d'una altra oportunitat", async () => {
    post.mockResolvedValue(result({ opportunity: { id: 8, target_amount_cents: 1_000_00, committed_cents: 100_00 } }));
    await useOpportunityStore.getState().commitContribution(8, 100_00);
    expect(useOpportunityStore.getState().realEstateOpportunity).toBe(detail);
  });

  it("si la resposta no porta el capital nou, torna a llegir el detall", async () => {
    post.mockResolvedValue(result({ opportunity: undefined as never }));
    get.mockReturnValue(new Promise(() => {}));
    const outcome = await useOpportunityStore.getState().commitContribution(7, 100_00);
    expect(outcome).toEqual({ amount_cents: 100_00, available_cents: 150_00, estimated_equity: null });
    expect(get).toHaveBeenCalledWith("/opportunities/7", expect.anything());
  });

  it("retorna el saldo com a desconegut si la resposta no porta un saldo vàlid", async () => {
    post.mockResolvedValue(result({ wallet: { available_cents: -1 } }));
    expect(await useOpportunityStore.getState().commitContribution(7, 100_00)).toEqual({
      amount_cents: 100_00,
      available_cents: null,
      estimated_equity: null,
    });
    expect(useWalletStore.getState().balance).toEqual(startingBalance);
  });

  it("no envia una segona aportació mentre la primera està en curs", async () => {
    let resolve!: (value: CommitmentResult) => void;
    post.mockReturnValue(new Promise((done) => { resolve = done; }));
    const pending = useOpportunityStore.getState().commitContribution(7, 100_00);
    expect(useOpportunityStore.getState().commitStatus).toBe("loading");
    expect(await useOpportunityStore.getState().commitContribution(7, 100_00)).toBeNull();
    expect(post).toHaveBeenCalledOnce();
    resolve(result());
    await pending;
    expect(useOpportunityStore.getState().commitStatus).toBe("success");
  });

  it.each([
    ["409 saldo insuficient", new ApiError("Insufficient funds", 409, null), "insufficient_funds", "No tienes saldo suficiente para esta aportación."],
    ["409 ja no admet", new ApiError("Opportunity no longer accepts this contribution", 409, null), "not_accepted", "Esta oportunidad ya no admite esta aportación."],
    ["401 sessió caducada", new ApiError("Invalid or missing session", 401, null), "session_expired", ""],
    ["404 no disponible", new ApiError("Opportunity not available", 404, null), "not_available", "Esta oportunidad ya no está disponible."],
    ["422 per sota del mínim", new ApiError("Amount below the minimum contribution", 422, null), "below_minimum", "El importe es inferior a la aportación mínima."],
    ["422 amb llista d'errors", new ApiError("HTTP Error 422", 422, { detail: [{ loc: ["body", "amount_cents"], msg: "Input should be a valid integer" }] }), "invalid_amount", "Introduce un importe válido, por ejemplo 100,00."],
    ["409 amb un altre text", new ApiError("Conflict", 409, null), "not_accepted", "Esta oportunidad ya no admite esta aportación."],
    ["500", new ApiError("Server error", 500, null), "unexpected", "No se ha podido comprometer la aportación. Inténtalo de nuevo."],
    ["xarxa", new TypeError("Failed to fetch"), "unexpected", "No se ha podido comprometer la aportación. Inténtalo de nuevo."],
  ])("davant un error %s no canvia ni el saldo ni el capital compromès", async (_label, error, kind, message) => {
    post.mockRejectedValue(error);
    expect(await useOpportunityStore.getState().commitContribution(7, 100_00)).toBeNull();
    expect(useOpportunityStore.getState()).toMatchObject({
      commitStatus: "error",
      commitError: kind,
      commitDetails: message,
      realEstateOpportunity: detail,
    });
    expect(useWalletStore.getState().balance).toEqual(startingBalance);
  });

  it("refreshRealEstateOpportunity actualitza el detall sense passar per «loading»", async () => {
    let resolve!: (value: unknown) => void;
    get.mockReturnValue(new Promise((done) => { resolve = done; }));
    const pending = useOpportunityStore.getState().refreshRealEstateOpportunity(7);
    expect(useOpportunityStore.getState()).toMatchObject({ detailStatus: "success", realEstateOpportunity: detail });
    resolve({ ...detail, committed_cents: 72_000_00 });
    await pending;
    expect(get).toHaveBeenCalledWith("/opportunities/7", expect.anything());
    expect(useOpportunityStore.getState().realEstateOpportunity?.committed_cents).toBe(72_000_00);
  });

  it("refreshRealEstateOpportunity conserva el detall si la consulta falla", async () => {
    get.mockRejectedValue(new TypeError("Failed to fetch"));
    await useOpportunityStore.getState().refreshRealEstateOpportunity(7);
    expect(useOpportunityStore.getState()).toMatchObject({ detailStatus: "success", realEstateOpportunity: detail });
  });

  it("refreshRealEstateOpportunity no toca un detall que ja no es mostra", async () => {
    await useOpportunityStore.getState().refreshRealEstateOpportunity(8);
    expect(get).not.toHaveBeenCalled();

    let resolve!: (value: unknown) => void;
    get.mockReturnValue(new Promise((done) => { resolve = done; }));
    const pending = useOpportunityStore.getState().refreshRealEstateOpportunity(7);
    // Mentrestant l'usuari obre una altra oportunitat.
    useOpportunityStore.setState({ detailId: 9, realEstateOpportunity: null, detailStatus: "loading" });
    resolve({ ...detail, committed_cents: 72_000_00 });
    await pending;
    expect(useOpportunityStore.getState()).toMatchObject({ detailId: 9, realEstateOpportunity: null });
  });

  it("resetCommitment deixa l'estat del compromís com al principi", async () => {
    post.mockRejectedValue(new TypeError("Failed to fetch"));
    await useOpportunityStore.getState().commitContribution(7, 100_00);
    useOpportunityStore.getState().resetCommitment();
    expect(useOpportunityStore.getState()).toMatchObject({ commitStatus: "idle", commitError: null, commitDetails: "" });
  });
});

describe("useOpportunityStore: detall empresarial", () => {
  // Només els camps que el store tracta; la resta no hi intervé.
  const business = {
    id: 44,
    type: "equity",
    title: "Expansión de BioPack",
  } as BusinessOpportunityGetResponse;

  it("passa per «loading» i desa el detall quan la consulta va bé", async () => {
    let resolve!: (value: unknown) => void;
    get.mockReturnValue(new Promise((done) => { resolve = done; }));
    const pending = useOpportunityStore.getState().fetchBusinessOpportunity(44);
    expect(useOpportunityStore.getState()).toMatchObject({
      detailStatus: "loading",
      detailId: 44,
      businessOpportunity: null,
    });

    resolve(business);
    await pending;
    expect(get).toHaveBeenCalledWith("/opportunities/44", expect.anything());
    expect(useOpportunityStore.getState()).toMatchObject({ detailStatus: "success", businessOpportunity: business });
  });

  it("desa el missatge d'error si la consulta falla", async () => {
    get.mockRejectedValue(new ApiError("Oportunidad no disponible", 404, null));
    await useOpportunityStore.getState().fetchBusinessOpportunity(44);
    expect(useOpportunityStore.getState()).toMatchObject({
      detailStatus: "error",
      detailDetails: "Oportunidad no disponible (HTTP 404)",
      businessOpportunity: null,
    });
  });

  it("descarta la resposta d'una consulta substituïda per una altra", async () => {
    let resolveFirst!: (value: unknown) => void;
    get.mockReturnValueOnce(new Promise((done) => { resolveFirst = done; }));
    get.mockResolvedValueOnce({ ...business, id: 45 });

    const first = useOpportunityStore.getState().fetchBusinessOpportunity(44);
    await useOpportunityStore.getState().fetchBusinessOpportunity(45);
    resolveFirst(business);
    await first;

    expect(useOpportunityStore.getState()).toMatchObject({ detailId: 45, businessOpportunity: { id: 45 } });
  });
});

describe("useOpportunityStore: llistat del catàleg", () => {
  it("envia la cerca i el tipus d'actiu i desa el llistat", async () => {
    const listed = [{ id: 4, type: "equity", title: "Cervecera artesana en Girona" }];
    get.mockResolvedValue(listed);

    await useOpportunityStore.getState().fetchOpportunities("girona", "equity");

    expect(get).toHaveBeenCalledWith(
      "/opportunities",
      expect.objectContaining({ params: { name: "girona", type: "equity" } }),
    );
    expect(useOpportunityStore.getState()).toMatchObject({ status: "success", opportunities: listed });
  });

  it("amb «Todos» passa el tipus com a null, que buildUrl omet de la petició", async () => {
    get.mockResolvedValue([]);

    await useOpportunityStore.getState().fetchOpportunities("girona", null);

    expect(get).toHaveBeenCalledWith(
      "/opportunities",
      expect.objectContaining({ params: { name: "girona", type: null } }),
    );
  });

  it("desa el missatge d'error i buida el llistat si la consulta falla", async () => {
    useOpportunityStore.setState({ opportunities: [{ id: 1 } as never] });
    get.mockRejectedValue(new ApiError("Internal Server Error", 500, null));

    await useOpportunityStore.getState().fetchOpportunities("", "real_estate");

    expect(useOpportunityStore.getState()).toMatchObject({
      status: "error",
      details: "Internal Server Error (HTTP 500)",
      opportunities: [],
    });
  });
});

describe("useOpportunityStore: comprometre una inversió empresarial (US03.1.2)", () => {
  // Escenari dels mockups: 184.500,00 € compromesos d'un objectiu de 300.000,00 €.
  const business = {
    id: 44,
    type: "equity",
    title: "Expansión de BioPack",
    target_amount_cents: 300_000_00,
    committed_cents: 184_500_00,
    minimum_contribution_cents: 250_00,
    business: { pre_investment_valuation_cents: 2_700_000_00 },
  } as BusinessOpportunityGetResponse;

  const investment = (overrides: Partial<CommitmentResult> = {}): CommitmentResult => ({
    commitment: {
      id: 2,
      opportunity_id: 44,
      amount_cents: 1_000_00,
      created_at: "2026-11-20T10:00:00Z",
      estimated_equity: "0.03333333333333333333333333333",
    },
    opportunity: { id: 44, target_amount_cents: 300_000_00, committed_cents: 185_500_00 },
    wallet: { available_cents: 500_00, committed_cents: 1_000_00, currency: "eur" },
    ...overrides,
  });

  beforeEach(() => {
    useOpportunityStore.setState({ detailId: 44, realEstateOpportunity: null, businessOpportunity: business });
    useWalletStore.setState({ status: "success", balance: { available_cents: 1_500_00, committed_cents: 0, currency: "eur" } });
  });

  it("actualitza el capital del detall empresarial i retorna la participació estimada del backend", async () => {
    post.mockResolvedValue(investment());
    const outcome = await useOpportunityStore.getState().commitContribution(44, 1_000_00, "equity");

    expect(post).toHaveBeenCalledExactlyOnceWith("/opportunities/44/commitments", { amount_cents: 1_000_00 });
    expect(outcome?.available_cents).toBe(500_00);
    expect(outcome?.estimated_equity).toBeCloseTo(0.0333333, 6);
    expect(useOpportunityStore.getState().businessOpportunity).toEqual({ ...business, committed_cents: 185_500_00 });
    expect(useWalletStore.getState().balance).toEqual({ available_cents: 500_00, committed_cents: 1_000_00, currency: "eur" });
  });

  it("si la resposta no porta una participació vàlida, la retorna com a desconeguda", async () => {
    post.mockResolvedValue(investment({ commitment: { ...investment().commitment, estimated_equity: "n/a" } }));
    const outcome = await useOpportunityStore.getState().commitContribution(44, 1_000_00, "equity");
    expect(outcome?.estimated_equity).toBeNull();
  });

  it("si la resposta no porta el capital nou, torna a llegir el detall empresarial", async () => {
    post.mockResolvedValue(investment({ opportunity: undefined as never }));
    get.mockReturnValue(new Promise(() => {}));
    await useOpportunityStore.getState().commitContribution(44, 1_000_00, "equity");
    expect(get).toHaveBeenCalledWith("/opportunities/44", expect.anything());
  });

  it.each([
    ["409 saldo insuficient", new ApiError("Insufficient funds", 409, null), "No tienes saldo suficiente para esta inversión."],
    ["409 ja no admet", new ApiError("Opportunity no longer accepts this contribution", 409, null), "Esta oportunidad ya no admite esta inversión."],
    ["500", new ApiError("Server error", 500, null), "No se ha podido comprometer la inversión. Inténtalo de nuevo."],
  ])("davant un error %s parla d'«inversión» i no canvia res", async (_label, error, message) => {
    post.mockRejectedValue(error);
    expect(await useOpportunityStore.getState().commitContribution(44, 1_000_00, "equity")).toBeNull();
    expect(useOpportunityStore.getState()).toMatchObject({ commitStatus: "error", commitDetails: message, businessOpportunity: business });
    expect(useWalletStore.getState().balance?.available_cents).toBe(1_500_00);
  });

  it("refreshBusinessOpportunity actualitza el detall empresarial sense passar per «loading»", async () => {
    useOpportunityStore.setState({ detailStatus: "success" });
    get.mockResolvedValue({ ...business, committed_cents: 300_000_00 });
    await useOpportunityStore.getState().refreshBusinessOpportunity(44);
    expect(useOpportunityStore.getState()).toMatchObject({
      detailStatus: "success",
      businessOpportunity: { committed_cents: 300_000_00 },
    });
  });

  it("refreshBusinessOpportunity no toca res si no es mostra aquell detall", async () => {
    useOpportunityStore.setState({ detailStatus: "success", detailId: 45 });
    await useOpportunityStore.getState().refreshBusinessOpportunity(44);
    expect(get).not.toHaveBeenCalled();
  });
});
