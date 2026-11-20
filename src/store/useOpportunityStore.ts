import { create } from "zustand";
import { fintechGet, fintechPost, ApiError, RequestStatus } from "../service/api";
import { INSUFFICIENT_FUNDS_MESSAGE } from "../pages/opportunities/dialogs/contributionAmount";
import { useWalletStore } from "./useWalletStore";

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
  // null: l'oportunitat no té aportació mínima (backend: OpportunityDetailRead).
  minimum_contribution_cents: number | null;
  promoter: Promoter;
  real_estate: RealEstate;
  server_time: string;
}

// Resposta de POST /api/opportunities/{id}/commitments (backend: CommitmentResultRead).
export interface CommitmentResult {
  commitment: { id: number; opportunity_id: number; amount_cents: number; created_at: string };
  opportunity: { id: number; target_amount_cents: number; committed_cents: number };
  wallet: unknown;
}

// Què ha passat en confirmar, perquè el diàleg sàpiga quines accions oferir.
export type CommitmentErrorKind = "insufficient_funds" | "not_accepted" | "unexpected";

export const COMMITMENT_ERRORS: Record<CommitmentErrorKind, string> = {
  insufficient_funds: INSUFFICIENT_FUNDS_MESSAGE,
  not_accepted: "Esta oportunidad ya no admite esta aportación.",
  unexpected: "No se ha podido comprometer la aportación. Inténtalo de nuevo.",
};

export interface CommitmentOutcome {
  amount_cents: number;
  // Saldo disponible després de l'aportació; null si la resposta no el porta en un format vàlid.
  available_cents: number | null;
}

// 409 «Insufficient funds»: el saldo ha canviat des de la validació del diàleg.
// 404, 409 i 422: l'oportunitat ja no està en finançament, no té prou pendent o el mínim ha canviat.
const toCommitmentError = (error: unknown): CommitmentErrorKind => {
  if (!(error instanceof ApiError)) return "unexpected";
  if (error.status === 409 && error.message === "Insufficient funds") return "insufficient_funds";
  if ([404, 409, 422].includes(error.status)) return "not_accepted";
  return "unexpected";
};

const isCents = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

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
  fetchOpportunities: (term?: string | null) => Promise<void>;
  detailStatus: RequestStatus;
  detailId: number | null;
  detailDetails: string;
  realEstateOpportunity: RealEstateOpportunityGetResponse | null;
  fetchRealEstateOpportunity: (id: number) => Promise<void>;
  commitStatus: "idle" | RequestStatus;
  commitError: CommitmentErrorKind | null;
  commitDetails: string;
  // Compromet `amountCents` del saldo disponible en l'oportunitat. Mai llança: retorna null si falla.
  commitContribution: (opportunityId: number, amountCents: number) => Promise<CommitmentOutcome | null>;
  resetCommitment: () => void;
}

export const useOpportunityStore = create<OpportunityState>((set, get) => ({
    status: "loading",
    details: "",
    opportunities: [],
    searchedOpportunities: [],
    fetchOpportunities: async (term?: string | null) => {
        set({ status: "loading", details: "" });
        try {
            const data = await fintechGet<Opportunity[]>("/opportunities", {
                params: {
                    name: term
                },
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
    commitStatus: "idle",
    commitError: null,
    commitDetails: "",
    commitContribution: async (opportunityId, amountCents) => {
        // Evita comprometre dues vegades amb un doble clic a «Confirmar aportación».
        if (get().commitStatus === "loading") return null;
        set({ commitStatus: "loading", commitError: null, commitDetails: "" });
        try {
            const data = await fintechPost<CommitmentResult>(
                `/opportunities/${opportunityId}/commitments`,
                { amount_cents: amountCents },
            );
            const funding = data?.opportunity;
            const current = get().realEstateOpportunity;
            if (current?.id === opportunityId && isCents(funding?.committed_cents) && isCents(funding?.target_amount_cents)) {
                // El detall mostra a l'instant el capital compromès i el percentatge nous.
                set({
                    realEstateOpportunity: {
                        ...current,
                        committed_cents: funding.committed_cents,
                        target_amount_cents: funding.target_amount_cents,
                    },
                });
            } else if (current?.id === opportunityId) {
                // Resposta inesperada: l'aportació s'ha fet, tornem a llegir el detall.
                void get().fetchRealEstateOpportunity(opportunityId);
            }
            const balance = useWalletStore.getState().applyBalance(data?.wallet);
            set({ commitStatus: "success", commitError: null, commitDetails: "" });
            return { amount_cents: amountCents, available_cents: balance?.available_cents ?? null };
        } catch (error: unknown) {
            // Un error no canvia ni el saldo ni el capital compromès que es mostren.
            const kind = toCommitmentError(error);
            set({ commitStatus: "error", commitError: kind, commitDetails: COMMITMENT_ERRORS[kind] });
            return null;
        }
    },
    resetCommitment: () => set({ commitStatus: "idle", commitError: null, commitDetails: "" }),
}));