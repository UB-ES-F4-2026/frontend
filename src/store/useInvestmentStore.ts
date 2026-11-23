import { create } from "zustand";
import { ApiError, fintechGet, type RequestStatus } from "../service/api";
import type { FundingStatus, OpportunityType } from "./useOpportunityStore";

// Estat actual de l'oportunitat d'una inversió (backend: CommitmentOpportunityRead).
export interface InvestmentOpportunity {
  id: number;
  title: string;
  type: OpportunityType;
  // L'estat d'ara, no el que tenia en invertir.
  funding_status: FundingStatus;
  target_amount_cents: number;
  committed_cents: number;
  deadline: string;
  // Una aportació inicial a una oportunitat pròpia pendent de revisió no té detall públic.
  is_public: boolean;
}

// Una inversió de l'usuari (backend: UserCommitmentRead). Cada compromís va per separat.
export interface Investment {
  id: number;
  amount_cents: number;
  created_at: string;
  // Percentatge ja multiplicat per 100, com a text (Decimal); null en les immobiliàries.
  estimated_equity: number | string | null;
  opportunity: InvestmentOpportunity;
}

export interface InvestmentsSummary {
  // Coincideix amb el saldo compromès de «Mi saldo».
  total_committed_cents: number;
  commitments_count: number;
  // Compromisos en oportunitats en finançament: dos a la mateixa oportunitat compten dos.
  in_funding_count: number;
}

// Resposta de GET /api/me/commitments, de la inversió més recent a la més antiga.
export interface Investments {
  summary: InvestmentsSummary;
  commitments: Investment[];
}

export const INVESTMENTS_ERROR = "No se han podido cargar tus inversiones.";

// Només compta l'última consulta.
let latestRequest = 0;

interface InvestmentState {
  status: "idle" | RequestStatus;
  // "" amb la sessió caducada: SessionManager ja porta al login.
  details: string;
  investments: Investments | null;
  fetchInvestments: () => Promise<void>;
}

export const useInvestmentStore = create<InvestmentState>((set) => ({
  status: "idle",
  details: "",
  investments: null,
  fetchInvestments: async () => {
    const requestId = ++latestRequest;
    set({ status: "loading", details: "" });
    try {
      const data = await fintechGet<Investments>("/me/commitments", { signal: AbortSignal.timeout(5000) });
      if (requestId !== latestRequest) return;
      set({ status: "success", investments: data });
    } catch (error: unknown) {
      if (requestId !== latestRequest) return;
      const details = error instanceof ApiError && error.status === 401 ? "" : INVESTMENTS_ERROR;
      set({ status: "error", details, investments: null });
    }
  },
}));
