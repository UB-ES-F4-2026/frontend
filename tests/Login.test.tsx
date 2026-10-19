import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "../src/pages/auth/Login";
import type { useAuthStore } from "../src/store/useAuthStore";

type AuthState = ReturnType<typeof useAuthStore.getState>;
const state = vi.hoisted(() => ({
  status: "idle" as AuthState["status"],
  details: "",
  active_account: null as AuthState["active_account"],
  login: vi.fn<AuthState["login"]>(),
}));

// Aïllem el formulari del store i de qualsevol petició al backend.
vi.mock("../src/store/useAuthStore", () => ({
  useAuthStore: (selector: (value: typeof state) => unknown) => selector(state),
}));

// La ruta d’inici simulada permet comprovar la redirecció després del login.
const loginRoutes = (
  <MemoryRouter initialEntries={["/login"]}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<h1>Pàgina simulada: inici</h1>} />
    </Routes>
  </MemoryRouter>
);

function renderLogin() {
  return render(loginRoutes);
}

async function submit(email = "gerard@example.com", password = "password123") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Correo electrónico"), email);
  await user.type(screen.getByLabelText("Contraseña"), password);
  await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
}

beforeEach(() => {
  vi.resetAllMocks();
  state.status = "idle";
  state.details = "";
  state.active_account = null;
  state.login.mockResolvedValue(null);
});

describe("Login aïllat del store", () => {
  it("envia les credencials i redirigeix a l’inici quan s’inicia la sessió", async () => {
    state.login.mockResolvedValue({ token: "token-123", id: 1, email: "gerard@example.com", created_at: "2026-10-17T10:00:00Z" });
    renderLogin();
    await submit();
    expect(state.login).toHaveBeenCalledExactlyOnceWith({ email: "gerard@example.com", password: "password123" });
    expect(await screen.findByText("Pàgina simulada: inici")).toBeInTheDocument();
  });

  it("mostra l’error del store i conserva el formulari", async () => {
    state.login.mockImplementation(async () => {
      state.status = "error";
      state.details = "El correo o la contraseña no son correctos.";
      return null;
    });
    const { rerender } = renderLogin();
    await submit();
    // El mock no notifica React: tornem a renderitzar per llegir el nou estat.
    rerender(loginRoutes);
    expect(screen.getByRole("alert")).toHaveTextContent("El correo o la contraseña no son correctos.");
    expect(screen.getByRole("form")).toBeInTheDocument();
  });

  it("no mostra errors d’un intent anterior en tornar a la pàgina", () => {
    state.status = "error";
    state.details = "Error anterior";
    renderLogin();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("no envia camps obligatoris buits ni un correu amb format incorrecte", async () => {
    renderLogin();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(screen.getByLabelText("Correo electrónico")).toBeInvalid();
    expect(screen.getByLabelText("Contraseña")).toBeInvalid();
    await submit("correu-invalid");
    expect(screen.getByLabelText("Correo electrónico")).toBeInvalid();
    expect(state.login).not.toHaveBeenCalled();
  });

  it("bloqueja els camps i l’enviament mentre espera resposta", async () => {
    state.status = "loading";
    renderLogin();
    expect(screen.getByLabelText("Correo electrónico")).toBeDisabled();
    expect(screen.getByLabelText("Contraseña")).toBeDisabled();
    const button = screen.getByRole("button", { name: /Iniciando sesión…/ });
    expect(button).toBeDisabled();
    expect(screen.getByRole("form")).toHaveAttribute("aria-busy", "true");
    await userEvent.setup().click(button);
    expect(state.login).not.toHaveBeenCalled();
  });

  it("ofereix l’enllaç per crear un compte", () => {
    renderLogin();
    expect(screen.getByRole("link", { name: "Regístrate" })).toHaveAttribute("href", "/register");
  });

  it("no mostra el formulari si la sessió ja està iniciada", () => {
    state.active_account = { token: "token-123", id: 1, email: "gerard@example.com", created_at: "2026-10-17T10:00:00Z" };
    renderLogin();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Ya has iniciado sesión con el correo gerard@example.com.");
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/");
  });
});
