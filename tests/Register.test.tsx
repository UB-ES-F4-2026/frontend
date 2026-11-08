import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
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

// Aïllem el formulari del store: cap prova crea comptes ni fa peticions al backend.
vi.mock("../src/store/useAuthStore", () => ({
  useAuthStore: (selector: (value: typeof state) => unknown) => selector(state),
}));

const personalData = { firstName: "María", lastName: "Prueba-López", email: "gerard@example.com", phone: "612 345 678" };
const terms = () => screen.getByRole("checkbox", { name: "Acepto las condiciones de uso." });
const privacy = () => screen.getByRole("checkbox", { name: "He leído la política de privacidad." });

function RegisterTestApp() {
  return (
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<h1>Inicio de sesión simulado</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

function renderRegister() {
  return render(<RegisterTestApp />);
}

async function fillPersonalData(user: ReturnType<typeof userEvent.setup>, email = personalData.email) {
  await user.type(screen.getByLabelText("Nombre", { exact: true }), personalData.firstName);
  await user.type(screen.getByLabelText("Apellidos"), personalData.lastName);
  await user.type(screen.getByLabelText("Correo electrónico"), email);
  await user.type(screen.getByLabelText("Número", { exact: true }), personalData.phone);
}

async function goToAccess(user: ReturnType<typeof userEvent.setup>) {
  await fillPersonalData(user);
  await user.click(screen.getByRole("button", { name: "Continuar" }));
}

async function fillAccess(user: ReturnType<typeof userEvent.setup>, password = "password123", confirmation = password) {
  await user.type(screen.getByLabelText("Contraseña", { exact: true }), password);
  await user.type(screen.getByLabelText("Confirma la contraseña"), confirmation);
}

async function submit(password: string) {
  const user = userEvent.setup();
  await goToAccess(user);
  await fillAccess(user, password);
  await user.click(terms());
  await user.click(privacy());
  await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
}

beforeEach(() => {
  vi.resetAllMocks();
  state.registrationStatus = "idle";
  state.registrationDetails = "";
  state.register.mockResolvedValue(null);
});

describe("Register: interfície de dues pantalles (tasca #25)", () => {
  it("comença per les dades personals, neteja errors anteriors i ofereix el login", () => {
    renderRegister();
    expect(state.resetRegistration).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("Nombre", { exact: true })).toBeInTheDocument();
    expect(screen.getByLabelText("Apellidos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /País y prefijo/ })).toHaveTextContent("España (+34)");
    expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
    expect(screen.getByLabelText("Número", { exact: true })).toBeInTheDocument();
    expect(screen.queryByLabelText("Contraseña", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText("Datos personales").closest("li")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Datos de acceso").closest("li")).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Inicia sesión" })).toHaveAttribute("href", "/login");
  });

  it("no avança amb els camps obligatoris buits", async () => {
    renderRegister();
    await userEvent.setup().click(screen.getByRole("button", { name: "Continuar" }));
    for (const label of ["Nombre", "Apellidos", "Correo electrónico", "Número"]) {
      expect(screen.getByLabelText(label, { exact: true })).toBeInvalid();
    }
    expect(screen.queryByRole("button", { name: "Crear cuenta" })).not.toBeInTheDocument();
    expect(state.register).not.toHaveBeenCalled();
  });

  it.each(["Nombre", "Apellidos"])("requereix %s encara que la resta de dades estiguin plenes", async (label) => {
    renderRegister();
    const user = userEvent.setup();
    await fillPersonalData(user);
    await user.clear(screen.getByLabelText(label, { exact: true }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByLabelText(label, { exact: true })).toBeInvalid();
    expect(screen.queryByLabelText("Contraseña", { exact: true })).not.toBeInTheDocument();
    expect(state.register).not.toHaveBeenCalled();
  });

  it("conserva el país i el número separats en canviar de pas", async () => {
    renderRegister();
    const user = userEvent.setup();
    await fillPersonalData(user);
    await user.click(screen.getByRole("button", { name: /País y prefijo/ }));
    await user.click(screen.getByRole("option", { name: "Francia (+33)" }));
    expect(screen.getByLabelText("Número", { exact: true })).toHaveValue(personalData.phone);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Volver atrás" }));
    expect(screen.getByRole("button", { name: /País y prefijo/ })).toHaveTextContent("Francia (+33)");
    expect(screen.getByLabelText("Número", { exact: true })).toHaveValue(personalData.phone);
    expect(state.register).not.toHaveBeenCalled();
  });

  it("distingeix països que comparteixen prefix", async () => {
    renderRegister();
    const user = userEvent.setup();
    for (const country of ["Canadá (+1)", "Estados Unidos (+1)"]) {
      await user.click(screen.getByRole("button", { name: /País y prefijo/ }));
      await user.click(screen.getByRole("option", { name: country }));
      expect(screen.getByRole("button", { name: /País y prefijo/ })).toHaveTextContent(country);
    }
    expect(state.register).not.toHaveBeenCalled();
  });

  it("no avança amb un correu de format incorrecte", async () => {
    renderRegister();
    const user = userEvent.setup();
    await fillPersonalData(user, "correu-invalid");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByLabelText("Correo electrónico")).toBeInvalid();
    expect(screen.queryByLabelText("Contraseña", { exact: true })).not.toBeInTheDocument();
    expect(state.register).not.toHaveBeenCalled();
  });

  it("avança sense registrar, actualitza el pas i mostra contrasenyes ocultes i caselles desmarcades", async () => {
    renderRegister();
    await goToAccess(userEvent.setup());
    expect(state.register).not.toHaveBeenCalled();
    expect(screen.getByText("Datos de acceso").closest("li")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Datos personales").closest("li")).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("status")).toHaveTextContent("Paso 2 de 2");
    expect(screen.getByRole("heading", { name: "Crear mi cuenta" })).toHaveFocus();
    expect(screen.queryByLabelText("Correo electrónico")).not.toBeInTheDocument();
    for (const label of ["Contraseña", "Confirma la contraseña"]) {
      expect(screen.getByLabelText(label, { exact: true })).toHaveAttribute("type", "password");
    }
    expect(screen.getByLabelText("Contraseña", { exact: true })).toHaveAccessibleDescription("La contraseña debe tener entre 8 y 72 caracteres.");
    expect(terms()).not.toBeChecked();
    expect(privacy()).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Volver atrás" })).toBeInTheDocument();
  });

  it("conserva tots els camps i les caselles en anar enrere i avançar, sense registrar", async () => {
    renderRegister();
    const user = userEvent.setup();
    await goToAccess(user);
    await fillAccess(user);
    await user.click(terms());
    await user.click(privacy());
    await user.click(screen.getByRole("button", { name: "Volver atrás" }));
    expect(screen.getByLabelText("Nombre", { exact: true })).toHaveValue(personalData.firstName);
    expect(screen.getByLabelText("Apellidos")).toHaveValue(personalData.lastName);
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue(personalData.email);
    expect(screen.getByLabelText("Número", { exact: true })).toHaveValue(personalData.phone);
    expect(screen.getByText("Datos personales").closest("li")).toHaveAttribute("aria-current", "step");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByLabelText("Contraseña", { exact: true })).toHaveValue("password123");
    expect(screen.getByLabelText("Confirma la contraseña")).toHaveValue("password123");
    expect(terms()).toBeChecked();
    expect(privacy()).toBeChecked();
    // També conservem una opció que l’usuari desmarca després.
    await user.click(privacy());
    await user.click(screen.getByRole("button", { name: "Volver atrás" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(terms()).toBeChecked();
    expect(privacy()).not.toBeChecked();
    expect(state.register).not.toHaveBeenCalled();
  });

  it.each([
    ["Consultar condiciones", "/legal/condiciones-de-uso"],
    ["Consultar privacidad", "/legal/politica-de-privacidad"],
  ])("%s obre el document en una altra pestanya i conserva el formulari", async (label, href) => {
    renderRegister();
    const user = userEvent.setup();
    await goToAccess(user);
    await fillAccess(user);
    const link = screen.getByRole("link", { name: `${label} (se abre en una pestaña nueva)` });
    expect(link).toHaveAttribute("href", href);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await user.click(link);
    expect(screen.getByText("Documentos en borrador, pendientes de revisión.")).toBeInTheDocument();
    expect(terms()).not.toBeChecked();
    expect(privacy()).not.toBeChecked();
    expect(screen.getByLabelText("Contraseña", { exact: true })).toHaveValue("password123");
    await user.click(screen.getByRole("button", { name: "Volver atrás" }));
    expect(screen.getByLabelText("Nombre", { exact: true })).toHaveValue(personalData.firstName);
    expect(screen.getByLabelText("Apellidos")).toHaveValue(personalData.lastName);
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue(personalData.email);
    expect(screen.getByLabelText("Número", { exact: true })).toHaveValue(personalData.phone);
    expect(state.register).not.toHaveBeenCalled();
  });

  it.each([
    ["Contraseña", "contraseña", "Confirma la contraseña"],
    ["Confirma la contraseña", "confirmación de contraseña", "Contraseña"],
  ])("mostra i oculta %s sense alterar el valor ni l’altre camp", async (label, action, other) => {
    renderRegister();
    const user = userEvent.setup();
    await goToAccess(user);
    await fillAccess(user);
    await user.click(screen.getByRole("button", { name: `Mostrar ${action}` }));
    expect(screen.getByLabelText(label, { exact: true })).toHaveAttribute("type", "text");
    expect(screen.getByLabelText(label, { exact: true })).toHaveValue("password123");
    expect(screen.getByLabelText(other, { exact: true })).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: `Ocultar ${action}` }));
    expect(screen.getByLabelText(label, { exact: true })).toHaveAttribute("type", "password");
    expect(screen.getByLabelText(label, { exact: true })).toHaveValue("password123");
    expect(state.register).not.toHaveBeenCalled();
  });

  it("permet arribar a l’ull amb Tab i activar-lo amb el teclat", async () => {
    renderRegister();
    const user = userEvent.setup();
    await goToAccess(user);
    await user.tab();
    expect(screen.getByLabelText("Contraseña", { exact: true })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Mostrar contraseña" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByLabelText("Contraseña", { exact: true })).toHaveAttribute("type", "text");
    expect(state.register).not.toHaveBeenCalled();
  });

  it("permet marcar les confirmacions amb el teclat sense enviar el formulari", async () => {
    renderRegister();
    const user = userEvent.setup();
    await goToAccess(user);
    await user.click(screen.getByLabelText("Confirma la contraseña"));
    await user.tab();
    expect(screen.getByRole("button", { name: "Mostrar confirmación de contraseña" })).toHaveFocus();
    await user.tab();
    expect(terms()).toHaveFocus();
    await user.keyboard(" ");
    expect(terms()).toBeChecked();
    await user.tab();
    expect(screen.getByRole("link", { name: "Consultar condiciones (se abre en una pestaña nueva)" })).toHaveFocus();
    await user.tab();
    expect(privacy()).toHaveFocus();
    await user.keyboard(" ");
    expect(privacy()).toBeChecked();
    expect(state.register).not.toHaveBeenCalled();
  });

  it("no envia si falta la confirmació de contrasenya", async () => {
    renderRegister();
    const user = userEvent.setup();
    await goToAccess(user);
    await user.type(screen.getByLabelText("Contraseña", { exact: true }), "password123");
    await user.click(terms());
    await user.click(privacy());
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
    expect(screen.getByLabelText("Confirma la contraseña")).toBeInvalid();
    expect(state.register).not.toHaveBeenCalled();
  });

  it.each(["condicions", "privacitat"])("no envia si falta acceptar %s", async (missing) => {
    renderRegister();
    const user = userEvent.setup();
    await goToAccess(user);
    await fillAccess(user);
    await user.click(missing === "condicions" ? privacy() : terms());
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
    expect(missing === "condicions" ? terms() : privacy()).toBeInvalid();
    expect(state.register).not.toHaveBeenCalled();
  });
});

// Regressió del contracte actual. ASCII i enviament de les dades noves corresponen a la #30.
describe("Register: comportament existent amb el store simulat", () => {
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

  it.each(["12345678", "😀".repeat(18)])("envia una contrasenya al límit del contracte actual: %s", async (password) => {
    renderRegister();
    await submit(password);
    expect(state.register).toHaveBeenCalledExactlyOnceWith({ email: personalData.email, password });
  });

  it("no envia contrasenyes amb confirmació diferent", async () => {
    renderRegister();
    const user = userEvent.setup();
    await goToAccess(user);
    await fillAccess(user, "password123", "password456");
    await user.click(terms());
    await user.click(privacy());
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Las contraseñas no coinciden.");
    expect(state.register).not.toHaveBeenCalled();
  });

  it("bloqueja camps, caselles, ulls i botons mentre espera resposta", async () => {
    const view = renderRegister();
    const user = userEvent.setup();
    await goToAccess(user);
    await fillAccess(user);
    state.registrationStatus = "loading";
    view.rerender(<RegisterTestApp />);
    for (const label of ["Contraseña", "Confirma la contraseña"]) {
      expect(screen.getByLabelText(label, { exact: true })).toBeDisabled();
    }
    expect(terms()).toBeDisabled();
    expect(privacy()).toBeDisabled();
    for (const name of ["Mostrar contraseña", "Mostrar confirmación de contraseña", "Volver atrás", "Creando cuenta…"]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
    expect(screen.getByRole("form")).toHaveAttribute("aria-busy", "true");
    await user.click(screen.getByRole("button", { name: "Creando cuenta…" }));
    expect(state.register).not.toHaveBeenCalled();
  });

  it("mostra l’error del store i conserva totes les dades per corregir-les", async () => {
    const view = renderRegister();
    await submit("password123");
    state.registrationStatus = "error";
    state.registrationDetails = "Ya existe una cuenta con este correo electrónico.";
    view.rerender(<RegisterTestApp />);
    expect(screen.getByRole("alert")).toHaveTextContent(state.registrationDetails);
    expect(screen.getByRole("alert")).not.toHaveTextContent("password123");
    expect(screen.getByLabelText("Contraseña", { exact: true })).toHaveValue("password123");
    expect(screen.getByLabelText("Confirma la contraseña")).toHaveValue("password123");
    expect(terms()).toBeChecked();
    expect(privacy()).toBeChecked();
    await userEvent.setup().click(screen.getByRole("button", { name: "Volver atrás" }));
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue(personalData.email);
    expect(screen.getByLabelText("Nombre", { exact: true })).toHaveValue(personalData.firstName);
    expect(screen.getByLabelText("Apellidos")).toHaveValue(personalData.lastName);
    expect(screen.getByLabelText("Número", { exact: true })).toHaveValue(personalData.phone);
    expect(screen.getByRole("form", { name: "Crear mi cuenta" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Inicio de sesión simulado" })).not.toBeInTheDocument();
  });

  it("redirigeix a /login quan el registre retorna l’usuari creat", async () => {
    state.register.mockResolvedValue({ id: 1, email: personalData.email, created_at: "2026-10-17T10:00:00Z" });
    renderRegister();
    await submit("password123");
    expect(await screen.findByRole("heading", { name: "Inicio de sesión simulado" })).toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.queryByText("Cuenta creada")).not.toBeInTheDocument();
    expect(state.register).toHaveBeenCalledOnce();
  });

  it("espera la confirmació del servidor abans de redirigir al login", async () => {
    let finish!: (user: Awaited<ReturnType<AuthState["register"]>>) => void;
    state.register.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    renderRegister();
    await submit("password123");
    expect(state.register).toHaveBeenCalledOnce();
    expect(screen.getByRole("form", { name: "Crear mi cuenta" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Inicio de sesión simulado" })).not.toBeInTheDocument();
    await act(async () => {
      finish({ id: 1, email: personalData.email, created_at: "2026-10-17T10:00:00Z" });
    });
    expect(await screen.findByRole("heading", { name: "Inicio de sesión simulado" })).toBeInTheDocument();
  });
});
