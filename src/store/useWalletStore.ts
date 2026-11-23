import { create } from "zustand";
import { ApiError, fintechGet, fintechPost } from "../service/api";
import type { RequestStatus } from "../service/api";

// Contracte de BalanceRead (backend: app/schemas/wallet.py), a GET /api/me/wallet i a la
// resposta de cada compromís. El saldo compromès està reservat: no forma part del disponible.
export interface WalletBalance {
  available_cents: number;
  committed_cents: number;
  currency: "eur";
}

// Resposta de POST /api/me/wallet/deposit-intent (backend: DepositIntentResponse).
export interface DepositIntent {
  client_secret: string;
  payment_intent_id: string;
}

// Ingrés que Stripe acaba de confirmar, perquè «Mi saldo» el pugui anunciar.
export interface CompletedDeposit {
  amount_cents: number;
  // false: el pagament s'ha completat, però el saldo encara no el reflecteix.
  reflected: boolean;
}

interface WalletState {
  status: "idle" | RequestStatus;
  details: string;
  balance: WalletBalance | null;
  fetchBalance: () => Promise<WalletBalance | null>;
  // Aplica el saldo que el backend retorna després d'una aportació o inversió correcta.
  applyBalance: (data: unknown) => WalletBalance | null;
  depositStatus: "idle" | RequestStatus;
  depositDetails: string;
  lastDeposit: CompletedDeposit | null;
  // Prepara el pagament amb Stripe d'un ingrés. Mai llança: retorna null si falla.
  createDepositIntent: (amountCents: number) => Promise<DepositIntent | null>;
  // Després que Stripe confirmi el pagament, espera que el saldo reflecteixi l'ingrés.
  // Retorna null si s'ha cancel·lat (p. ex. en sortir de la pàgina).
  completeDeposit: () => Promise<CompletedDeposit | null>;
  // Descarta el pagament en curs i el seu error, però no l'ingrés que ha d'anunciar «Mi saldo».
  resetDeposit: () => void;
  reset: () => void;
}

export const BALANCE_ERROR = "No se ha podido consultar tu saldo";

// Límits de l'import d'un ingrés: el mínim de DepositIntentCreate (backend) i el màxim que
// Stripe admet en un sol pagament (vuit xifres en cèntims).
export const MIN_DEPOSIT_CENTS = 50;
export const MAX_DEPOSIT_CENTS = 99_999_999;

export const DEPOSIT_UNAVAILABLE =
  "Los ingresos con tarjeta no están disponibles en este momento. Inténtalo más tarde.";
const DEPOSIT_ERROR = "No se ha podido preparar el pago. Inténtalo de nuevo.";

const toDepositError = (error: unknown): string => {
  if (!(error instanceof ApiError)) return DEPOSIT_ERROR;
  switch (error.status) {
    // SessionManager ja porta al login: no cal cap missatge.
    case 401:
      return "";
    // L'import no compleix DepositIntentCreate. La validació local ho evita; es manté per si canvia.
    case 422:
      return "El importe no es válido. Revísalo e inténtalo de nuevo.";
    // Stripe no està configurat al servidor.
    case 503:
      return DEPOSIT_UNAVAILABLE;
    // 400: Stripe no ha pogut crear el pagament. La resta, error inesperat.
    default:
      return DEPOSIT_ERROR;
  }
};

// L'ingrés arriba al saldo quan el backend rep el webhook de Stripe, uns instants després del
// pagament. Es consulta el saldo cada segon durant deu segons com a màxim.
export const DEPOSIT_POLL_INTERVAL_MS = 1000;
export const DEPOSIT_POLL_ATTEMPTS = 10;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

// Saldo total: una aportació mou diners del disponible al compromès, però no el canvia.
// Amb BigInt, la suma és exacta encara que superi 2^53 - 1.
const totalOf = (balance: WalletBalance) => BigInt(balance.available_cents) + BigInt(balance.committed_cents);

// Lectura del saldo que no toca l'estat visible: serveix per comparar abans i després de pagar.
const readBalance = async (): Promise<WalletBalance | null> => {
  try {
    return parseBalance(await fintechGet<unknown>("/me/wallet", { signal: AbortSignal.timeout(5000) }));
  } catch {
    return null;
  }
};

// Cada consulta té una revisió: una resposta d'una sessió o consulta anterior es descarta.
let requestRevision = 0;
let controller: AbortController | null = null;

// El mateix per als ingressos: sortir de la pàgina o tancar la sessió atura l'espera.
let depositRevision = 0;
// Ingrés preparat: import i saldo total que hi haurà quan el backend l'hagi acreditat
// (null si no s'ha pogut llegir el saldo abans de pagar).
let pendingDeposit: { amountCents: number; expectedTotal: bigint | null } | null = null;

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

  depositStatus: "idle",
  depositDetails: "",
  lastDeposit: null,

  createDepositIntent: async (amountCents) => {
    // Evita crear dos pagaments amb un doble clic a «Continuar al pago».
    if (get().depositStatus === "loading") return null;
    const revision = ++depositRevision;
    pendingDeposit = null;
    set({ depositStatus: "loading", depositDetails: "" });
    try {
      // El saldo d'abans de pagar permet saber quan el backend ha acreditat aquest ingrés.
      const [intent, before] = await Promise.all([
        fintechPost<DepositIntent>("/me/wallet/deposit-intent", { amount_cents: amountCents }),
        readBalance(),
      ]);
      if (revision !== depositRevision) return null;
      if (typeof intent?.client_secret !== "string" || !intent.client_secret) {
        throw new Error("Respuesta de pago no válida");
      }
      pendingDeposit = { amountCents, expectedTotal: before ? totalOf(before) + BigInt(amountCents) : null };
      set({ depositStatus: "success", depositDetails: "" });
      return intent;
    } catch (error: unknown) {
      if (revision === depositRevision) {
        set({ depositStatus: "error", depositDetails: toDepositError(error) });
      }
      return null;
    }
  },

  completeDeposit: async () => {
    const pending = pendingDeposit;
    if (!pending) return null;
    const revision = depositRevision;
    let reflected = false;
    if (pending.expectedTotal !== null) {
      for (let attempt = 0; attempt < DEPOSIT_POLL_ATTEMPTS && !reflected; attempt++) {
        await wait(DEPOSIT_POLL_INTERVAL_MS);
        if (revision !== depositRevision) return null;
        const balance = await readBalance();
        if (revision !== depositRevision) return null;
        reflected = balance !== null && totalOf(balance) >= pending.expectedTotal;
      }
    }
    pendingDeposit = null;
    const deposit = { amount_cents: pending.amountCents, reflected };
    set({ depositStatus: "idle", depositDetails: "", lastDeposit: deposit });
    return deposit;
  },

  resetDeposit: () => {
    depositRevision++;
    pendingDeposit = null;
    set({ depositStatus: "idle", depositDetails: "" });
  },

  // En sortir de la pàgina o canviar de sessió, el saldo anterior deixa d'existir.
  reset: () => {
    cancelPendingRequest();
    get().resetDeposit();
    set({ status: "idle", details: "", balance: null, lastDeposit: null });
  },
}));