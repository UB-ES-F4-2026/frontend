import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Register from "../src/pages/auth/Register";
import type { useAuthStore } from "../src/store/useAuthStore";

type AuthState = ReturnType<typeof useAuthStore.getState>;
const state = vi.hoisted(() => ({
  registrationStatus: "idle" as AuthState["registrationStatus"],
  registrationDetails: "",
  register: vi.fn<AuthState["register"]>(),
  resetRegistration: vi.fn(),
}));

// Aïllem el formulari del store i de qualsevol petició al backend.
vi.mock("../src/store/useAuthStore", () => ({
  useAuthStore: (selector: (value: typeof state) => unknown) => selector(state),
}));

function renderRegister() {
  return render(<MemoryRouter><Register /></MemoryRouter>);
}

async function submit(password: string, email = "gerard@example.com") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Correo electrónico"), email);
  await user.type(screen.getByLabelText("Contraseña"), password);
  await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
}

beforeEach(() => {
  vi.resetAllMocks();
  state.registrationStatus = "idle";
  state.registrationDetails = "";
  state.register.mockResolvedValue(null);
});

describe("Register aïllat del store", () => {
  it("neteja l’estat anterior i ofereix l’enllaç al login", () => {
    renderRegister();
    expect(state.resetRegistration).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Inicia sesión" })).toHaveAttribute("href", "/login");
  });

  it("no envia camps obligatoris buits", async () => {
    renderRegister();
    await userEvent.setup().click(screen.getByRole("button", { name: "Crear cuenta" }));
    expect(screen.getByLabelText("Correo electrónico")).toBeInvalid();
    expect(screen.getByLabelText("Contraseña")).toBeInvalid();
    expect(state.register).not.toHaveBeenCalled();
  });

  it("no envia un correu amb format incorrecte", async () => {
    renderRegister();
    await submit("password123", "correu-invalid");
    expect(screen.getByLabelText("Correo electrónico")).toBeInvalid();
    expect(state.register).not.toHaveBeenCalled();
  });

  it.each(["1234567", "😀".repeat(7)])("rebutja menys de 8 caràcters: %s", async (password) => {
    renderRegister();
    await submit(password);
    expect(screen.getByRole("alert")).toHaveTextContent("La contraseña debe tener al menos 8 caracteres.");
    expect(state.register).not.toHaveBeenCalled();
  });

  it("rebutja contrasenyes que superen 72 bytes UTF-8", async () => {
    renderRegister();
    await submit("😀".repeat(19));
    expect(screen.getByRole("alert")).toHaveTextContent("La contraseña es demasiado larga.");
    expect(state.register).not.toHaveBeenCalled();
  });

  it.each(["12345678", "😀".repeat(18)])("accepta una contrasenya al límit permès: %s", async (password) => {
    renderRegister();
    await submit(password);
    expect(state.register).toHaveBeenCalledExactlyOnceWith({ email: "gerard@example.com", password });
  });

  it("bloqueja els camps i l’enviament mentre espera resposta", async () => {
    state.registrationStatus = "loading";
    renderRegister();
    expect(screen.getByLabelText("Correo electrónico")).toBeDisabled();
    expect(screen.getByLabelText("Contraseña")).toBeDisabled();
    const button = screen.getByRole("button", { name: /Creando cuenta…/ });
    expect(button).toBeDisabled();
    expect(screen.getByRole("form")).toHaveAttribute("aria-busy", "true");
    await userEvent.setup().click(button);
    expect(state.register).not.toHaveBeenCalled();
  });

  it("mostra l’error del store i conserva el formulari", async () => {
    state.registrationStatus = "error";
    state.registrationDetails = "Ya existe una cuenta con este correo electrónico.";
    renderRegister();
    await submit("password123");
    expect(screen.getByRole("alert")).toHaveTextContent(state.registrationDetails);
    expect(screen.getByRole("form")).toBeInTheDocument();
    expect(screen.queryByText("Cuenta creada")).not.toBeInTheDocument();
  });

  it("substitueix el formulari per la confirmació quan es crea el compte", async () => {
    state.register.mockResolvedValue({ id: 1, email: "gerard@example.com", created_at: "2026-10-17T10:00:00Z" });
    renderRegister();
    await submit("password123");
    expect(await screen.findByText("Cuenta creada")).toBeInTheDocument();
    expect(screen.getByText(/Tu cuenta con el correo gerard@example.com/)).toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir al inicio de sesión" })).toHaveAttribute("href", "/login");
  });
});
