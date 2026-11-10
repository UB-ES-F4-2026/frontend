import { create } from "zustand";
import { fintechGet, fintechPost, ApiError } from "../service/api";
import type { RequestStatus } from "../service/api";

export interface LoginPayload {
  email: string;
  password: string;
}

// Contracte del registre actual: només correu i contrasenya.
export interface RegisterPayload {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
}

// Crear el compte retorna aquestes dades, però no un token de sessió.
export interface RegisteredUser {
  id: number;
  email: string;
  created_at: string;
}

// El token viu a la cookie HttpOnly; el store només conserva l’usuari.
export type UserType = RegisteredUser;

// Estat global visible per la resta de l'app
interface AuthState {
  // "idle" fins que l’usuari intenta iniciar sessió.
  status: "idle" | RequestStatus;
  details: string;
  active_account: UserType | null;
  // Fals fins que sabem si hi ha sessió: evita expulsar d’una ruta privada en recarregar.
  sessionChecked: boolean;
  login: (credentials : LoginPayload) => Promise<UserType | null>;
  // El registre té un estat propi per no interferir amb el login.
  registrationStatus: "idle" | RequestStatus;
  registrationDetails: string;
  register: (userData: RegisterPayload) => Promise<RegisteredUser | null>;
  resetRegistration: () => void;
  clearSession: () => void;
  restoreSession: (signal: AbortSignal) => Promise<void>;
  logout: () => Promise<boolean>;
}

// Evita que una recuperació inicial tardana desfaci una acció de l’usuari.
let sessionRevision = 0;

const GENERIC_LOGIN_ERROR = "No se ha podido iniciar sesión. Inténtalo de nuevo en unos instantes.";

// Missatges per a l’usuari segons la resposta del backend a /auth/login.
const getLoginErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError && error.status === 401) {
    return "El correo o la contraseña no son correctos.";
  }
  if (error instanceof ApiError && error.status === 422) {
    return "Revisa el correo y la contraseña. El correo debe ser válido y la contraseña debe ocupar como máximo 72 bytes.";
  }
  return GENERIC_LOGIN_ERROR;
};

// No mostrem missatges, valors ni context retornats pel servidor: poden contenir contrasenyes.
const getRegistrationErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError && error.status === 409) {
    return "Ya existe una cuenta con este correo electrónico. Inicia sesión o utiliza otro correo.";
  }
  if (error instanceof ApiError && error.status === 422) {
    const labels: Record<string, string> = {
      first_name: "nombre", last_name: "apellidos", email: "correo electrónico", phone: "teléfono", password: "contraseña",
    };
    const body = error.details;
    const details = typeof body === "object" && body !== null && "detail" in body ? body.detail : undefined;
    const fields = new Set<string>();
    if (Array.isArray(details)) {
      for (const detail of details) {
        if (typeof detail !== "object" || detail === null || !Array.isArray(detail.loc)) continue;
        const [source, field] = detail.loc;
        if (source === "body" && typeof field === "string" && Object.hasOwn(labels, field)) fields.add(labels[field]);
      }
    }
    return fields.size ? `Revisa los siguientes campos: ${[...fields].join(", ")}.` : "Revisa los datos del formulario.";
  }
  if (error instanceof TypeError) {
    return "No se ha podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.";
  }
  return "No se ha podido crear la cuenta. Inténtalo de nuevo en unos instantes.";
};

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "idle",
  details: "",
  active_account: null,
  sessionChecked: false,
  registrationStatus: "idle",
  registrationDetails: "",

  login: async (credentials: LoginPayload) => {
    // Com al registre, evitem peticions duplicades mentre n’hi ha una en curs.
    if (get().status === "loading") return null;
    sessionRevision++;
    set({ status: "loading", details: "" });

    try {
      const account = await fintechPost<RegisteredUser>("/auth/login", {
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
      });
      set({ status: "success", details: "", active_account: account, sessionChecked: true });
      return account;
    } catch (error: unknown) {
      set({ status: "error", details: getLoginErrorMessage(error), active_account: null });
      return null;
    }
  },

  restoreSession: async (signal) => {
    const revision = sessionRevision;
    try {
      const account = await fintechGet<RegisteredUser>("/auth/me", { signal, skipSessionRedirect: true });
      // Una resposta inicial tardana no ha de substituir un login o logout posterior.
      if (!signal.aborted && revision === sessionRevision && !get().active_account) {
        set({ status: "success", active_account: account });
      }
    } catch {
      // Sense cookie som visitants; un error de xarxa tampoc obliga a anar al login.
    } finally {
      if (!signal.aborted) set({ sessionChecked: true });
    }
  },

  register: async (userData: RegisterPayload) => {
    // Zustand actualitza l’estat immediatament: evitem peticions duplicades.
    if (get().registrationStatus === "loading") return null;
    set({ registrationStatus: "loading", registrationDetails: "" });

    try {
      const newUser = await fintechPost<RegisteredUser>("/auth/register", {
        email: userData.email.trim().toLowerCase(),
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone,
        password: userData.password,
      });

      // No modifiquem active_account: el registre no autentica l’usuari.
      set({ registrationStatus: "success", registrationDetails: "" });
      return newUser;
    } catch (error: unknown) {
      set({ registrationStatus: "error", registrationDetails: getRegistrationErrorMessage(error) });
      return null;
    }
  },

  // En tornar al formulari, esborrem missatges anteriors sense interrompre cap petició.
  resetRegistration: () => {
    if (get().registrationStatus !== "loading") {
      set({ registrationStatus: "idle", registrationDetails: "" });
    }
  },

  clearSession: () => {
    sessionRevision++;
    set({
      status: "idle",
      details: "",
      active_account: null,
      sessionChecked: true,
    });
  },
  
  logout: async () => {
    if (get().status === "loading") return false;
    sessionRevision++;
    set({ status: "loading", details: "" });
    try {
      await fintechPost<void>("/auth/logout");
    } catch (error) {
      // Un 401 indica que ja no hi ha una sessió vàlida al servidor.
      if (!(error instanceof ApiError && error.status === 401)) {
        set({ status: "error", details: "No se ha podido cerrar sesión. Inténtalo de nuevo." });
        return false;
      }
    }
    get().clearSession();
    return true;
  },

}));
