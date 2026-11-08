import { create } from "zustand";
import { fintechGet, ApiError, RequestStatus } from "../service/api";

export type OpportunityType = "real_estate" | "equity";

export interface Opportunity {
  id: number;
  user_id: number | null;
  type: OpportunityType;
  title: string;
  description: string;
  location: string;
  cover_image_url: string | null;
  target_amount_cents: number;
  committed_cents: number;
  deadline: string;
  date_published: string | null;
  date_closed: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunityImage {
  url: string;
  alt: string | null;
}

export interface Promoter {
  user_id: number;
  legal_name: string;
  image_url: string | null;
  published_projects_count: number;
  experience_years: number;
  location: string;
}

export type RealEstatePurpose = "acquisition" | "construction" | "renovation" | "acquisition_and_renovation";

export type RealEstateIntendedUse = "rental" | "sale" | "own_use";

export type RealEstateAssetType = "residential" | "commercial" | "industrial" | "land" | "mixed";
export interface RealEstate {
  purpose: RealEstatePurpose;
  intended_use: RealEstateIntendedUse;
  asset_type: RealEstateAssetType;
  surface_m2: number;
  planned_housing_units: number;
  estimated_works_end: string | null;
  estimated_rental_start: string | null;
  public_latitude: number | null;
  public_longitude: number | null;
  images: string[] | null;
}

export interface RealEstateOpportunityGetResponse extends Opportunity {
  minimum_contribution_cents: number;
  promoter: Promoter;
  real_estate: RealEstate;
  server_time: string; 
}

const toErrorMessage = (error: unknown) => {
    if (error instanceof ApiError) return `${error.message} (HTTP ${error.status})`;
    if (error instanceof Error) return error.message;
    return "Se ha producido un error desconocido.";
};

// Descarta respuestas de peticiones de detalle que ya han sido sustituidas por otra.
let latestDetailRequest = 0;

interface OpportunityState {
  status: RequestStatus;
  details: string;
  opportunities: Opportunity[];
  fetchOpportunities: () => Promise<void>;
  detailStatus: RequestStatus;
  detailId: number | null;
  detailDetails: string;
  realEstateOpportunity: RealEstateOpportunityGetResponse | null;
  fetchRealEstateOpportunity: (id: number) => Promise<void>;
}

export const useOpportunityStore = create<OpportunityState>((set) => ({
    status: "loading",
    details: "",
    opportunities: [],
    fetchOpportunities: async () => {
        set({ status: "loading", details: "" });
        try {
            const data = await fintechGet<Opportunity[]>("/opportunities", {
                signal: AbortSignal.timeout(5000)
            });
            set({ status: "success", details: "", opportunities: data });
        } catch (error : unknown) {
            set({ status: "error", details: toErrorMessage(error), opportunities: [] });
        }
    },
    detailStatus: "loading",
    detailId: null,
    detailDetails: "",
    realEstateOpportunity: null,
    fetchRealEstateOpportunity: async (id) => {
        const requestId = ++latestDetailRequest;
        set({ detailStatus: "loading", detailId: id, detailDetails: "", realEstateOpportunity: null });
        try {
            const data = await fintechGet<RealEstateOpportunityGetResponse>(`/opportunities/${id}`, {
                signal: AbortSignal.timeout(5000)
            });
            if (requestId !== latestDetailRequest) return;
            set({ detailStatus: "success", realEstateOpportunity: data });
        } catch (error : unknown) {
            if (requestId !== latestDetailRequest) return;
            set({ detailStatus: "error", detailDetails: toErrorMessage(error), realEstateOpportunity: null });
        }
    },
}));