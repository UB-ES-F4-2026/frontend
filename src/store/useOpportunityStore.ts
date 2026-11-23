import { create } from "zustand";
import { fintechGet, fintechPost, ApiError, RequestStatus } from "../service/api";
import {
  INSUFFICIENT_FUNDS_MESSAGE,
  INVALID_AMOUNT_MESSAGE,
} from "../pages/opportunities/dialogs/contributionAmount";
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

// Valors dels enums del backend (app/models/business_opportunity.py).
export type BusinessSector =
  | "fintech" | "industry" | "saas" | "health" | "biotech" | "cleantech" | "agritech"
  | "foodtech" | "d2c" | "education" | "media" | "tourism" | "logistic" | "ai" | "other";

export type BusinessPhase = "pre_seed" | "seed" | "early" | "growth" | "late";

export interface Business {
  sector: BusinessSector;
  phase: BusinessPhase;
  pre_investment_valuation_cents: number;
  // Percentatge ja multiplicat per 100. El backend l'envia com a Decimal: arriba com a text.
  equity_offered: number | string;
}

// Resposta de GET /api/opportunities/{id} per a una oportunitat empresarial
// (backend: BusinessOpportunityDetailRead). No porta galeria pròpia.
export interface BusinessOpportunityGetResponse {
  id: number;
  type: OpportunityType;
  status: string;
  title: string;
  description: string;
  location: string;
  cover_image_url: string | null;
  target_amount_cents: number;
  committed_cents: number;
  minimum_contribution_cents: number | null;
  date_published: string;
  deadline: string;
  promoter: Promoter;
  business: Business;
  server_time: string;
}

// Resposta de POST /api/opportunities/{id}/commitments (backend: CommitmentResultRead).
export interface CommitmentResult {
  commitment: { id: number; opportunity_id: number; amount_cents: number; created_at: string };
  opportunity: { id: number; target_amount_cents: number; committed_cents: number };
  wallet: unknown;
}

// Què ha passat en confirmar, perquè el diàleg sàpiga quines accions oferir.
export type CommitmentErrorKind =
  | "session_expired"
  | "not_available"
  | "below_minimum"
  | "invalid_amount"
  | "insufficient_funds"
  | "not_accepted"
  | "unexpected";

// Contracte del backend (US03.1). Els dos 409 i els dos 422 només es distingeixen pel `detail`.
export const COMMITMENT_ERRORS: Record<CommitmentErrorKind, string> = {
  // SessionManager ja porta al login: el diàleg no mostra res.
  session_expired: "",
  not_available: "Esta oportunidad ya no está disponible.",
  // El mínim ha canviat al backend; el diàleg només coneix l'anterior, per això no es mostra la xifra.
  below_minimum: "El importe es inferior a la aportación mínima.",
  invalid_amount: INVALID_AMOUNT_MESSAGE,
  insufficient_funds: INSUFFICIENT_FUNDS_MESSAGE,
  not_accepted: "Esta oportunidad ya no admite esta aportación.",
  unexpected: "No se ha podido comprometer la aportación. Inténtalo de nuevo.",
};

export interface CommitmentOutcome {
  amount_cents: number;
  // Saldo disponible després de l'aportació; null si la resposta no el porta en un format vàlid.
  available_cents: number | null;
}

const toCommitmentError = (error: unknown): CommitmentErrorKind => {
  if (!(error instanceof ApiError)) return "unexpected";
  switch (error.status) {
    case 401:
      return "session_expired";
    case 404:
      return "not_available";
    case 409:
      // «Insufficient funds»: el saldo ha canviat des de la validació del diàleg. Qualsevol altre
      // 409: ja no està en finançament o no li queda prou capital pendent.
      return error.message === "Insufficient funds" ? "insufficient_funds" : "not_accepted";
    case 422:
      // Text: el mínim ha canviat. Llista d'errors de FastAPI: l'import no té un format vàlid.
      return error.message === "Amount below the minimum contribution" ? "below_minimum" : "invalid_amount";
    default:
      return "unexpected";
  }
};

// Dades de l'immoble en crear l'oportunitat (backend: RealEstateOpportunityCreate). Els decimals
// van com a text perquè el backend els llegeix com a Decimal sense passar per coma flotant.
export interface RealEstateCreate {
  purpose: RealEstatePurpose;
  intended_use: RealEstateIntendedUse;
  asset_type: RealEstateAssetType;
  surface_m2: string;
  planned_housing_units: number | null;
  estimated_works_end: string | null;
  estimated_rental_start: string | null;
  public_latitude: number | null;
  public_longitude: number | null;
}

// Cos `metadata` de POST /api/opportunities (backend: OpportunityCreate). Les imatges van a part,
// al mateix formulari multipart.
export interface OpportunityCreateMetadata {
  type: OpportunityType;
  title: string;
  description: string;
  location: { municipality: string; province: string; country: string };
  target_amount_cents: number;
  minimum_contribution_cents: number;
  // ISO amb zona horària: el backend rebutja les dates sense zona.
  deadline: string;
  initial_contribution_cents: number | null;
  // Dades pròpies de cada tipus: les del pas Inmueble o les del pas Empresa (#68).
  real_estate?: RealEstateCreate;
  business?: Record<string, unknown>;
}

export const CREATE_OPPORTUNITY_ERRORS = {
  forbidden: "Necesitas una entidad promotora para crear oportunidades.",
  insufficient_funds: INSUFFICIENT_FUNDS_MESSAGE,
  not_reserved: "No se ha podido reservar tu aportación inicial. Inténtalo de nuevo.",
  invalid_image: "Alguna imagen no es válida. Usa imágenes JPG, PNG o WebP de hasta 5 MB.",
  invalid_data: "Algún dato de la oportunidad no es válido. Revísalo y vuelve a enviarla.",
  unexpected: "No se ha podido enviar la oportunidad. Inténtalo de nuevo.",
} as const;

// Textos `detail` del backend (app/core/media.py) quan una imatge no és vàlida.
const IMAGE_ERRORS = new Set([
  "At least one image is required",
  "Image exceeds the maximum size",
  "Unsupported image format",
  "Image content type does not match its content",
]);

const toCreateOpportunityError = (error: unknown): string => {
  if (!(error instanceof ApiError)) return CREATE_OPPORTUNITY_ERRORS.unexpected;
  switch (error.status) {
    case 401:
      // SessionManager ja porta al login: el formulari no mostra res.
      return "";
    case 403:
      return CREATE_OPPORTUNITY_ERRORS.forbidden;
    case 409:
      // El saldo pot haver canviat des que es va validar el pas «Financiación».
      return error.message === "Insufficient available balance"
        ? CREATE_OPPORTUNITY_ERRORS.insufficient_funds
        : CREATE_OPPORTUNITY_ERRORS.not_reserved;
    case 422:
      return IMAGE_ERRORS.has(error.message)
        ? CREATE_OPPORTUNITY_ERRORS.invalid_image
        : CREATE_OPPORTUNITY_ERRORS.invalid_data;
    default:
      return CREATE_OPPORTUNITY_ERRORS.unexpected;
  }
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
  // `type` null (o absent): totes les oportunitats, sense filtrar per tipus d'actiu.
  fetchOpportunities: (term?: string | null, type?: OpportunityType | null) => Promise<void>;
  detailStatus: RequestStatus;
  detailId: number | null;
  detailDetails: string;
  realEstateOpportunity: RealEstateOpportunityGetResponse | null;
  fetchRealEstateOpportunity: (id: number) => Promise<void>;
  // Torna a llegir el detall que ja es mostra sense passar per «loading» (no desmunta la pàgina).
  refreshRealEstateOpportunity: (id: number) => Promise<void>;
  // Detall empresarial: comparteix detailStatus, detailId i detailDetails amb l'immobiliari.
  businessOpportunity: BusinessOpportunityGetResponse | null;
  fetchBusinessOpportunity: (id: number) => Promise<void>;
  commitStatus: "idle" | RequestStatus;
  commitError: CommitmentErrorKind | null;
  commitDetails: string;
  // Compromet `amountCents` del saldo disponible en l'oportunitat. Mai llança: retorna null si falla.
  commitContribution: (opportunityId: number, amountCents: number) => Promise<CommitmentOutcome | null>;
  resetCommitment: () => void;
  createStatus: "idle" | RequestStatus;
  createDetails: string;
  // Crea l'oportunitat pendent de revisió. Mai llança: retorna null si falla.
  createOpportunity: (metadata: OpportunityCreateMetadata, images: File[]) => Promise<Opportunity | null>;
  resetCreation: () => void;
}

export const useOpportunityStore = create<OpportunityState>((set, get) => ({
    status: "loading",
    details: "",
    opportunities: [],
    searchedOpportunities: [],
    fetchOpportunities: async (term?: string | null, type?: OpportunityType | null) => {
        set({ status: "loading", details: "" });
        try {
            // buildUrl omet els paràmetres null o undefined: sense tipus no s'envia `type`.
            const data = await fintechGet<Opportunity[]>("/opportunities", {
                params: {
                    name: term,
                    type,
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
    refreshRealEstateOpportunity: async (id) => {
        // Només actualitza el detall que es mostra, i no invalida una càrrega completa en curs.
        const isCurrent = () => get().detailId === id && get().detailStatus === "success";
        if (!isCurrent()) return;
        const requestId = latestDetailRequest;
        try {
            const data = await fintechGet<RealEstateOpportunityGetResponse>(`/opportunities/${id}`, {
                signal: AbortSignal.timeout(5000)
            });
            if (requestId !== latestDetailRequest || !isCurrent() || data?.id !== id) return;
            set({ realEstateOpportunity: data });
        } catch {
            // Si falla, es manté el detall que ja es mostrava.
        }
    },
    businessOpportunity: null,
    fetchBusinessOpportunity: async (id) => {
        const requestId = ++latestDetailRequest;
        set({ detailStatus: "loading", detailId: id, detailDetails: "", businessOpportunity: null });
        try {
            const data = await fintechGet<BusinessOpportunityGetResponse>(`/opportunities/${id}`, {
                signal: AbortSignal.timeout(5000)
            });
            if (requestId !== latestDetailRequest) return;
            set({ detailStatus: "success", businessOpportunity: data });
        } catch (error : unknown) {
            if (requestId !== latestDetailRequest) return;
            set({ detailStatus: "error", detailDetails: toErrorMessage(error), businessOpportunity: null });
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
    createStatus: "idle",
    createDetails: "",
    createOpportunity: async (metadata, images) => {
        // Evita crear dues oportunitats amb un doble clic a «Enviar a revisión».
        if (get().createStatus === "loading") return null;
        set({ createStatus: "loading", createDetails: "" });
        const body = new FormData();
        body.append("metadata", JSON.stringify(metadata));
        // L'ordre es conserva: la primera imatge és la portada.
        images.forEach((image) => body.append("images", image));
        try {
            const created = await fintechPost<Opportunity>("/opportunities", body);
            set({ createStatus: "success", createDetails: "" });
            return created;
        } catch (error: unknown) {
            set({ createStatus: "error", createDetails: toCreateOpportunityError(error) });
            return null;
        }
    },
    resetCreation: () => set({ createStatus: "idle", createDetails: "" }),
}));