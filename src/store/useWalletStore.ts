import { create } from "zustand";
import { fintechGet } from "../service/api";
import type { RequestStatus } from "../service/api";

// Contracte de BalanceRead (backend: app/schemas/wallet.py), a GET /api/me/wallet i a la
// resposta de cada compromís. El saldo compromès està reservat: no forma part del disponible.
export interface WalletBalance {
  available_cents: number;
  committed_cents: number;
  currency: "eur";
}

interface WalletState {
  status: "idle" | RequestStatus;
  details: string;
  balance: WalletBalance | null;
  fetchBalance: () => Promise<WalletBalance | null>;
  // Aplica el saldo que el backend retorna després d'una aportació o inversió correcta.
  applyBalance: (data: unknown) => WalletBalance | null;
  reset: () => void;
}

export const BALANCE_ERROR = "No se ha podido consultar tu saldo";

const isValidCents = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

// Una resposta incompleta o amb valors no vàlids és un error: mai la convertim en zero.
const parseBalance = (data: unknown): WalletBalance | null => {
  if (typeof data !== "object" || data === null) return null;
  const { available_cents, committed_cents, currency } = data as Record<string, unknown>;
  if (
    !isValidCents(available_cents) ||
    !isValidCents(committed_cents) ||
    typeof currency !== "string" ||
    currency.toLowerCase() !== "eur"
  ) {
    return null;
  }
  return { available_cents, committed_cents, currency: "eur" };
};

// Cada consulta té una revisió: una resposta d'una sessió o consulta anterior es descarta.
let requestRevision = 0;
let controller: AbortController | null = null;

// Invalida la consulta en curs perquè una resposta antiga no substitueixi dades més noves.
const cancelPendingRequest = () => {
  requestRevision++;
  controller?.abort();
  controller = null;
};

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

  applyBalance: (data) => {
    // El saldo del compromís és posterior a qualsevol consulta pendent: la descartem.
    // Si la resposta no és vàlida, no toquem l'estat; la propera consulta el tornarà a llegir.
    const balance = parseBalance(data);
    if (!balance) return null;
    cancelPendingRequest();
    set({ status: "success", details: "", balance });
    return balance;
  },

  // En sortir de la pàgina o canviar de sessió, el saldo anterior deixa d'existir.
  reset: () => {
    cancelPendingRequest();
    set({ status: "idle", details: "", balance: null });
  },
}));