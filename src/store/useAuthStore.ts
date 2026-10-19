import { create } from "zustand";
import { fintechPost, ApiError } from "../service/api";
import type { RequestStatus } from "../service/api";

export interface UserType {
    token: string;
    email: string;
    name: string;
    surnames: string;
    phone: string;
    birthdate: string;
    employment: string;
    email_verified: boolean;
    bank_verified: boolean;
    balance: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// Contracte del registre actual: només correu i contrasenya.
export interface RegisterPayload {
  email: string;
  password: string;
}

// Crear el compte retorna aquestes dades, però no un token de sessió.
export interface RegisteredUser {
  id: number;
  email: string;
  created_at: string;
}

// Estat global visible per la resta de l'app
interface AuthState {
  status: RequestStatus;
  details: string;
  active_account: UserType | null;
  login: (credentials : LoginPayload) => Promise<void>;
  // El registre té un estat propi per no interferir amb el login.
  registrationStatus: "idle" | RequestStatus;
  registrationDetails: string;
  register: (userData: RegisterPayload) => Promise<RegisteredUser | null>;
  resetRegistration: () => void;
  logout: () => void;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    return `${error.message} (HTTP ${error.status})`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unknown error occured.";
};


export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  details: "",
  active_account: null,
  registrationStatus: "idle",
  registrationDetails: "",

  login: async (credentials) => {
    set({ status: "loading", details: "" });

    try {
      const user = await fintechPost<UserType>("/auth/login", credentials);

      set({
        status: "success",
        details: "",
        active_account: user,
      });
    } catch (error: unknown) {
      set({
        status: "error",
        details: getErrorMessage(error),
        active_account: null,
      });
    }
  },

  register: async (userData) => {
    // Zustand actualitza l’estat immediatament: evitem peticions duplicades.
    if (get().registrationStatus === "loading") return null;
    set({ registrationStatus: "loading", registrationDetails: "" });

    try {
      const newUser = await fintechPost<RegisteredUser>("/auth/register", {
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
      });

      // No modifiquem active_account: el registre no autentica l’usuari.
      set({ registrationStatus: "success", registrationDetails: "" });
      return newUser;
    } catch (error: unknown) {
      let message = "No se ha podido crear la cuenta. Inténtalo de nuevo en unos instantes.";
      if (error instanceof ApiError && error.status === 409) {
        message = "Ya existe una cuenta con este correo electrónico. Inicia sesión o utiliza otro correo.";
      } else if (error instanceof ApiError && error.status === 422) {
        message = "Revisa el correo y la contraseña. El correo debe ser válido y la contraseña debe tener al menos 8 caracteres y ocupar como máximo 72 bytes.";
      }
      set({ registrationStatus: "error", registrationDetails: message });
      return null;
    }
  },

  // En tornar al formulari, esborrem missatges anteriors sense interrompre cap petició.
  resetRegistration: () => {
    if (get().registrationStatus !== "loading") {
      set({ registrationStatus: "idle", registrationDetails: "" });
    }
  },

  logout: () => {
    set({
      status: "success",
      details: "",
      active_account: null,
    });
  },
}));