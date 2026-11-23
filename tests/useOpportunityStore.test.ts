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

describe("useOpportunityStore: detall immobiliari", () => {
  it("descarta la resposta d'una consulta substituïda per una de més recent", async () => {
    let resolveFirst!: (value: RealEstateOpportunityGetResponse) => void;
    let resolveSecond!: (value: RealEstateOpportunityGetResponse) => void;
    get
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }));

    const firstRequest = useOpportunityStore.getState().fetchRealEstateOpportunity(1);
    const secondRequest = useOpportunityStore.getState().fetchRealEstateOpportunity(2);
    const secondDetail = { ...detail, id: 2 };
    resolveSecond(secondDetail);
    await secondRequest;
    resolveFirst({ ...detail, id: 1 });
    await firstRequest;

    expect(useOpportunityStore.getState()).toMatchObject({
      detailStatus: "success",
      detailId: 2,
      realEstateOpportunity: secondDetail,
    });
  });
});

describe("useOpportunityStore: crear una oportunitat", () => {
  const metadata = {
    type: "real_estate" as const,
    title: "Local comercial en Sabadell",
    description: "Adquisición y reforma de un local.",
    location: { municipality: "Sabadell", province: "Barcelona", country: "España" },
    target_amount_cents: 15_000_000,
    minimum_contribution_cents: 10_000,
    deadline: "2099-01-31T22:59:00.000Z",
    initial_contribution_cents: 500_000,
  };
  const images = [
    new File(["a"], "portada.png", { type: "image/png" }),
    new File(["b"], "segona.jpg", { type: "image/jpeg" }),
  ];

  it("envia les dades com a «metadata» i les imatges en ordre, en un formulari multipart", async () => {
    post.mockResolvedValue({ id: 99 });

    const created = await useOpportunityStore.getState().createOpportunity(metadata, images);

    expect(created).toEqual({ id: 99 });
    const [url, body] = post.mock.calls[0];
    expect(url).toBe("/opportunities");
    expect(body).toBeInstanceOf(FormData);
    expect(JSON.parse((body as FormData).get("metadata") as string)).toEqual(metadata);
    expect((body as FormData).getAll("images").map((file) => (file as File).name)).toEqual(["portada.png", "segona.jpg"]);
    expect(useOpportunityStore.getState()).toMatchObject({ createStatus: "success", createDetails: "" });
  });

  it("no envia una segona petició mentre la primera està en curs", async () => {
    let resolve!: (value: unknown) => void;
    post.mockReturnValue(new Promise((done) => { resolve = done; }));

    const first = useOpportunityStore.getState().createOpportunity(metadata, images);
    expect(await useOpportunityStore.getState().createOpportunity(metadata, images)).toBeNull();
    resolve({ id: 99 });
    await first;

    expect(post).toHaveBeenCalledOnce();
  });

  it.each([
    [new ApiError("Insufficient available balance", 409, null), "No tienes saldo suficiente para esta aportación."],
    [new ApiError("Initial contribution could not be reserved", 409, null), "No se ha podido reservar tu aportación inicial. Inténtalo de nuevo."],
    [new ApiError("A promoting entity is required to create opportunities", 403, null), "Necesitas una entidad promotora para crear oportunidades."],
    [new ApiError("Image exceeds the maximum size", 422, null), "Alguna imagen no es válida. Usa imágenes JPG, PNG o WebP de hasta 5 MB."],
    [new ApiError("HTTP Error 422", 422, { detail: [] }), "Algún dato de la oportunidad no es válido. Revísalo y vuelve a enviarla."],
    [new ApiError("Not authenticated", 401, null), ""],
    [new ApiError("Internal Server Error", 500, null), "No se ha podido enviar la oportunidad. Inténtalo de nuevo."],
    [new TypeError("Failed to fetch"), "No se ha podido enviar la oportunidad. Inténtalo de nuevo."],
  ])("tradueix l'error %s a un missatge per a l'usuari", async (error, message) => {
    post.mockRejectedValue(error);

    expect(await useOpportunityStore.getState().createOpportunity(metadata, images)).toBeNull();
    expect(useOpportunityStore.getState()).toMatchObject({ createStatus: "error", createDetails: message });
  });

  it("resetCreation deixa l'enviament com al principi", async () => {
    post.mockRejectedValue(new ApiError("Internal Server Error", 500, null));
    await useOpportunityStore.getState().createOpportunity(metadata, images);

    useOpportunityStore.getState().resetCreation();

    expect(useOpportunityStore.getState()).toMatchObject({ createStatus: "idle", createDetails: "" });
  });
});
