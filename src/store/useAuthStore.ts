import { create } from "zustand";
import { fintechPost, ApiError, RequestStatus } from "../service/api";

export interface UserType {
    token: string;
    email: string;
    name: string;
    surnames: string;
    phone: number;
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

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  surnames: string;
  phone: number;
  birthdate: string;
  employment: string;
}

// Estat global visible per la resta de l'app
interface AuthState {
  status: RequestStatus;
  details: string;
  active_account: UserType | null;
  login: (credentials : LoginPayload) => Promise<void>;
  register: (userData : RegisterPayload) => Promise<void>;
  logout: () => void;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    return `${error.message} (HTTP ${error.status})`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "S'ha produït un error desconegut.";
};


export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  details: "",
  active_account: null,

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
    set({ status: "loading", details: "" });

    try {
      const newUser = await fintechPost<UserType>("/auth/register", userData);

      set({
        status: "success",
        details: "",
        active_account: newUser,
      });
    } catch (error: unknown) {
      set({
        status: "error",
        details: getErrorMessage(error),
        active_account: null,
      });
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