import { create } from "zustand";
import { fintechGet } from "../service/api";
import type { RequestStatus } from "../service/api";

// Contracte de GET /api/me/wallet (backend: app/schemas/wallet.py, BalanceRead).
export interface WalletBalance {
  available_cents: number;
  currency: "eur";
}

interface WalletState {
  status: "idle" | RequestStatus;
  details: string;
  balance: WalletBalance | null;
  fetchBalance: () => Promise<WalletBalance | null>;
  reset: () => void;
}

export const BALANCE_ERROR = "No se ha podido consultar tu saldo";

// Una resposta incompleta o amb valors no vàlids és un error: mai la convertim en zero.
const parseBalance = (data: unknown): WalletBalance | null => {
  if (typeof data !== "object" || data === null) return null;
  const { available_cents, currency } = data as Record<string, unknown>;
  if (
    typeof available_cents !== "number" ||
    !Number.isSafeInteger(available_cents) ||
    available_cents < 0 ||
    typeof currency !== "string" ||
    currency.toLowerCase() !== "eur"
  ) {
    return null;
  }
  return { available_cents, currency: "eur" };
};

// Cada consulta té una revisió: una resposta d'una sessió o consulta anterior es descarta.
let requestRevision = 0;
let controller: AbortController | null = null;

export const useWalletStore = create<WalletState>((set, get) => ({
  status: "idle",
  details: "",
  balance: null,

  fetchBalance: async () => {
    // Evita peticions duplicades mentre n'hi ha una en curs (p. ex. doble clic a «Reintentar»).
    if (get().status === "loading") return null;
    const revision = ++requestRevision;
    controller = new AbortController();
    // No mostrem l'import anterior com a vigent mentre es consulta.
    set({ status: "loading", details: "", balance: null });

    try {
      const data = await fintechGet<unknown>("/me/wallet", { signal: controller.signal });
      if (revision !== requestRevision) return null;
      const balance = parseBalance(data);
      if (!balance) throw new Error("Respuesta de saldo no válida");
      set({ status: "success", details: "", balance });
      return balance;
    } catch {
      // Un 401 ja avisa SessionManager, que porta al login; aquí només mostrem un error genèric.
      if (revision === requestRevision) {
        set({ status: "error", details: BALANCE_ERROR, balance: null });
      }
      return null;
    }
  },

  // En sortir de la pàgina o canviar de sessió, el saldo anterior deixa d'existir.
  reset: () => {
    requestRevision++;
    controller?.abort();
    controller = null;
    set({ status: "idle", details: "", balance: null });
  },
}));
