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

// Aïllem el formulari del store: cap prova crea comptes ni fa peticions al backend.
vi.mock("../src/store/useAuthStore", () => ({
  useAuthStore: (selector: (value: typeof state) => unknown) => selector(state),
}));

const personalData = { fullName: "María Prueba-López", email: "gerard@example.com", phone: "+34 612 345 678" };
const terms = () => screen.getByRole("checkbox", { name: "Acepto las condiciones de uso." });
const privacy = () => screen.getByRole("checkbox", { name: "He leído la política de privacidad." });

function renderRegister() {
  return render(<MemoryRouter><Register /></MemoryRouter>);
}

async function fillPersonalData(user: ReturnType<typeof userEvent.setup>, email = personalData.email) {
  await user.type(screen.getByLabelText("Nombre y apellidos"), personalData.fullName);
  await user.type(screen.getByLabelText("Correo electrónico"), email);
  await user.type(screen.getByLabelText("Número de teléfono"), personalData.phone);
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
    expect(screen.getByLabelText("Nombre y apellidos")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
    expect(screen.getByLabelText("Número de teléfono")).toBeInTheDocument();
    expect(screen.queryByLabelText("Contraseña", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText("Datos personales").closest("li")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Datos de acceso").closest("li")).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Inicia sesión" })).toHaveAttribute("href", "/login");
  });

  it("no avança amb els camps obligatoris buits", async () => {
    renderRegister();
    await userEvent.setup().click(screen.getByRole("button", { name: "Continuar" }));
    for (const label of ["Nombre y apellidos", "Correo electrónico", "Número de teléfono"]) {
      expect(screen.getByLabelText(label)).toBeInvalid();
    }
    expect(screen.queryByRole("button", { name: "Crear cuenta" })).not.toBeInTheDocument();
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
    expect(screen.getByLabelText("Nombre y apellidos")).toHaveValue(personalData.fullName);
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue(personalData.email);
    expect(screen.getByLabelText("Número de teléfono")).toHaveValue(personalData.phone);
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
    ["Consultar condiciones", "Condiciones de uso"],
    ["Consultar privacidad", "Política de privacidad"],
  ])("%s mostra l’avís provisional sense enviar ni canviar les caselles", async (button, title) => {
    renderRegister();
    const user = userEvent.setup();
    await goToAccess(user);
    await fillAccess(user);
    await user.click(screen.getByRole("button", { name: button }));
    expect(screen.getByText(`${title}: documento en preparación`).closest('[role="status"]')).toHaveTextContent("Estamos trabajando en este documento. Estará disponible próximamente.");
    expect(terms()).not.toBeChecked();
    expect(privacy()).not.toBeChecked();
    expect(screen.getByLabelText("Contraseña", { exact: true })).toHaveValue("password123");
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
    view.rerender(<MemoryRouter><Register /></MemoryRouter>);
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
    view.rerender(<MemoryRouter><Register /></MemoryRouter>);
    expect(screen.getByRole("alert")).toHaveTextContent(state.registrationDetails);
    expect(screen.getByRole("alert")).not.toHaveTextContent("password123");
    expect(screen.getByLabelText("Contraseña", { exact: true })).toHaveValue("password123");
    expect(screen.getByLabelText("Confirma la contraseña")).toHaveValue("password123");
    expect(terms()).toBeChecked();
    expect(privacy()).toBeChecked();
    await userEvent.setup().click(screen.getByRole("button", { name: "Volver atrás" }));
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue(personalData.email);
    expect(screen.getByLabelText("Nombre y apellidos")).toHaveValue(personalData.fullName);
    expect(screen.getByLabelText("Número de teléfono")).toHaveValue(personalData.phone);
    expect(screen.queryByText("Cuenta creada")).not.toBeInTheDocument();
  });

  it("mostra la confirmació amb enllaç al login segons el contracte actual", async () => {
    state.register.mockResolvedValue({ id: 1, email: personalData.email, created_at: "2026-10-17T10:00:00Z" });
    renderRegister();
    await submit("password123");
    expect(await screen.findByText("Cuenta creada")).toBeInTheDocument();
    expect(screen.getByText(/Tu cuenta con el correo gerard@example.com/)).toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir al inicio de sesión" })).toHaveAttribute("href", "/login");
    expect(state.register).toHaveBeenCalledOnce();
  });
});
