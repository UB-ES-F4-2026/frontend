import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, fintechGet } from "../src/service/api";
import { useOpportunityStore, type Opportunity, type RealEstateOpportunityGetResponse } from "../src/store/useOpportunityStore";

vi.mock("../src/service/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/service/api")>(),
  fintechGet: vi.fn(),
}));

const get = vi.mocked(fintechGet);
const opportunity: Opportunity = {
  id: 1,
  user_id: 3,
  type: "real_estate",
  title: "Edificio en Girona",
  description: "Rehabilitación residencial.",
  location: "Girona",
  cover_image_url: null,
  target_amount_cents: 100_000,
  committed_cents: 0,
  deadline: "2026-12-01T00:00:00Z",
  date_published: "2026-11-01T00:00:00Z",
  date_closed: null,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
};

const detail = (id: number): RealEstateOpportunityGetResponse => ({
  ...opportunity,
  id,
  minimum_contribution_cents: 5_000,
  promoter: {
    user_id: 3,
    legal_name: "Promotora Ada SL",
    image_url: null,
    published_projects_count: 1,
    experience_years: 2,
    location: "Girona",
  },
  real_estate: {
    purpose: "renovation",
    intended_use: "rental",
    asset_type: "residential",
    surface_m2: 80,
    planned_housing_units: 1,
    estimated_works_end: null,
    estimated_rental_start: null,
    public_latitude: null,
    public_longitude: null,
    images: null,
  },
  server_time: "2026-11-01T00:00:00Z",
});

beforeEach(() => {
  vi.resetAllMocks();
  useOpportunityStore.setState(useOpportunityStore.getInitialState(), true);
});

describe("useOpportunityStore aïllat de l'API", () => {
  it("consulta el catàleg amb el terme de cerca i desa el resultat", async () => {
    get.mockResolvedValue([opportunity]);

    await useOpportunityStore.getState().fetchOpportunities("Girona");

    expect(get).toHaveBeenCalledWith("/opportunities", expect.objectContaining({
      params: { name: "Girona" },
      signal: expect.any(AbortSignal),
    }));
    expect(useOpportunityStore.getState()).toMatchObject({
      status: "success",
      details: "",
      opportunities: [opportunity],
    });
  });

  it("deixa el catàleg buit i mostra el detall de l'error quan falla", async () => {
    get.mockRejectedValue(new ApiError("Unavailable", 503, null));

    await useOpportunityStore.getState().fetchOpportunities();

    expect(useOpportunityStore.getState()).toMatchObject({
      status: "error",
      details: "Unavailable (HTTP 503)",
      opportunities: [],
    });
  });

  it("descarta una resposta de detall substituïda per una petició més recent", async () => {
    let resolveFirst!: (value: RealEstateOpportunityGetResponse) => void;
    let resolveSecond!: (value: RealEstateOpportunityGetResponse) => void;
    get
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }));

    const firstRequest = useOpportunityStore.getState().fetchRealEstateOpportunity(1);
    const secondRequest = useOpportunityStore.getState().fetchRealEstateOpportunity(2);
    resolveSecond(detail(2));
    await secondRequest;
    resolveFirst(detail(1));
    await firstRequest;

    expect(useOpportunityStore.getState()).toMatchObject({
      detailStatus: "success",
      detailId: 2,
      realEstateOpportunity: detail(2),
    });
  });
});
