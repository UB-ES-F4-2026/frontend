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

interface OpportunityState {
  status: RequestStatus;
  details: string;
  opportunities: Opportunity[];
  fetchOpportunities: () => Promise<void>;
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
            let message = "Se ha producido un error desconocido.";

            if (error instanceof ApiError) {
                message = `${error.message} (HTTP ${error.status})`;
            } else if (error instanceof Error) {
                message = error.message;
            }

            set({ status: "error", details: message, opportunities: [] });
        }
    },
}));