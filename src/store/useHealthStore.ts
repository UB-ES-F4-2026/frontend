import { create } from "zustand";
import { fintechGet, ApiError, RequestStatus } from "../service/api";

// El tipus que ve de FastAPI a /api/health
interface HealthType {
    status: string,
    service: string,
    database: string
}

// Estat global visible per la resta de l'app
interface HealthState {
  status: RequestStatus;    // loading, success o error 
  details: string;          // Per exemple, un missatge d'error
  database_ok: boolean;
  service: string;
  general_status_ok: boolean;
  checkConnection: () => Promise<void>;    // Funció que crida al backend i gestiona l'estat en funció de què passa
}

const initialValues = {
  database_ok: false,
  service: "",
  general_status_ok: false,
};

// Configuració de l'estat
export const useHealthStore = create<HealthState>((set) => ({
  status: "loading",
  details: "",
  ...initialValues,

  checkConnection: async () => {
    set({ 
        status: "loading", 
        details: "",
        ...initialValues
    });

    try {
      const data = await fintechGet<HealthType>("/health", {
        signal: AbortSignal.timeout(5000),
      });

      set({
        status: "success",
        details: "",
        database_ok: data.database === 'ok',
        service: data.service,
        general_status_ok: data.status === 'ok'
      });

    } catch (error: unknown) {
      let message = "Se ha producido un error desconocido.";

      if (error instanceof ApiError) {
        message = `${error.message} (HTTP ${error.status})`;
      } else if (error instanceof Error) {
        message = error.message;
      }

      set({ 
        status: "error", 
        details: message,
        ...initialValues
      });
    }
  },
}));