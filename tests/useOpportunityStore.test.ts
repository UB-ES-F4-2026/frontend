import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, fintechGet, fintechPost } from "../src/service/api";
import {
  useOpportunityStore,
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
    expect(outcome).toEqual({ amount_cents: 100_00, available_cents: 150_00 });
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
    expect(outcome).toEqual({ amount_cents: 100_00, available_cents: 150_00 });
    expect(get).toHaveBeenCalledWith("/opportunities/7", expect.anything());
  });

  it("retorna el saldo com a desconegut si la resposta no porta un saldo vàlid", async () => {
    post.mockResolvedValue(result({ wallet: { available_cents: -1 } }));
    expect(await useOpportunityStore.getState().commitContribution(7, 100_00)).toEqual({
      amount_cents: 100_00,
      available_cents: null,
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
