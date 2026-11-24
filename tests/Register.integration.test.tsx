import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Register from "../src/pages/auth/Register";
import { useAuthStore } from "../src/store/useAuthStore";

// Component, store i servei reals: només simulem fetch, sense crear comptes.
const fetchMock = vi.fn();
beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("Registre: una única petició amb les dades dels dos passos (#30)", () => {
  it.each([
    ["España (+34)", "612 345 678", "+34612345678"],
    ["España (+34)", "+34 612 345 678", "+34612345678"],
    ["Francia (+33)", "612 345 678", "+33612345678"],
  ])("envia el telèfon de %s: %s com %s", async (country, phone, normalizedPhone) => {
    let finish!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => { finish = resolve; }));
    const user = userEvent.setup({ delay: null });
    render(<MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<h1>Inicio de sesión simulado</h1>} />
      </Routes>
    </MemoryRouter>);

    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(fetchMock).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("Nombre", { exact: true }), "  María  ");
    await user.type(screen.getByLabelText("Apellidos"), "  Prueba-López  ");
    await user.type(screen.getByLabelText("Correo electrónico"), "Maria@Example.COM");
    if (country !== "España (+34)") {
      await user.click(screen.getByRole("button", { name: /País y prefijo/ }));
      await user.click(screen.getByRole("option", { name: country }));
    }
    await user.type(screen.getByLabelText("Número", { exact: true }), phone);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Volver atrás" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
    expect(fetchMock).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Contraseña", { exact: true }), " Password1 ");
    await user.type(screen.getByLabelText("Confirma la contraseña"), " Password1 ");
    await user.click(screen.getByRole("checkbox", { name: "Acepto las condiciones de uso." }));
    await user.click(screen.getByRole("checkbox", { name: "He leído la política de privacidad." }));
    await user.dblClick(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/register");
    expect(options.method).toBe("POST");
    expect(options.headers.get("Content-Type")).toBe("application/json");
    expect(options.credentials).toBe("include");
    expect(JSON.parse(options.body)).toEqual({
      first_name: "María", last_name: "Prueba-López", email: "maria@example.com",
      phone: normalizedPhone, password: " Password1 ",
    });
    expect(screen.getByRole("button", { name: "Creando cuenta…" })).toBeDisabled();
    expect(screen.queryByRole("heading", { name: "Inicio de sesión simulado" })).not.toBeInTheDocument();

    await act(async () => {
      finish(new Response(JSON.stringify({ id: 1, email: "maria@example.com", first_name: "María",
        last_name: "Prueba-López", phone: normalizedPhone, created_at: "2026-11-09T12:00:00Z" }),
      { status: 201, headers: { "Content-Type": "application/json" } }));
    });
    expect(await screen.findByRole("heading", { name: "Inicio de sesión simulado" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

// Incloem dades sensibles als errors simulats per comprovar que mai no es mostren.
describe("Registre: errors del servidor sense perdre dades (#30)", () => {
  it.each([
    [409, "Ya existe una cuenta con este correo electrónico."],
    [422, "Revisa los siguientes campos: teléfono."],
    [500, "No se ha podido crear la cuenta."],
    [401, "No se ha podido crear la cuenta."],
    [0, "No se ha podido conectar con el servidor."],
  ])("conserva el formulari després de l’error %s i permet corregir i reintentar", async (status, message) => {
    const password = "NoMostrar42!";
    if (status === 0) {
      fetchMock.mockRejectedValueOnce(new TypeError(password));
    } else {
      const detail = status === 422
        ? [{ loc: ["body", "phone"], msg: password, input: password, ctx: { password } }]
        : password;
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ detail }), {
        status, headers: { "Content-Type": "application/json" },
      }));
    }
    const user = userEvent.setup({ delay: null });
    render(<MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<h1>Inicio de sesión simulado</h1>} />
      </Routes>
    </MemoryRouter>);
    await user.type(screen.getByLabelText("Nombre", { exact: true }), "María");
    await user.type(screen.getByLabelText("Apellidos"), "Prueba-López");
    await user.type(screen.getByLabelText("Correo electrónico"), "maria@example.com");
    await user.type(screen.getByLabelText("Número", { exact: true }), "612 345 678");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Contraseña", { exact: true }), password);
    await user.type(screen.getByLabelText("Confirma la contraseña"), password);
    await user.click(screen.getByRole("checkbox", { name: "Acepto las condiciones de uso." }));
    await user.click(screen.getByRole("checkbox", { name: "He leído la política de privacidad." }));
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("alert")).not.toHaveTextContent(password);
    expect(screen.getByLabelText("Contraseña", { exact: true })).toHaveValue(password);
    expect(screen.getByLabelText("Confirma la contraseña")).toHaveValue(password);
    expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeEnabled();
    expect(screen.queryByRole("heading", { name: "Inicio de sesión simulado" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Volver atrás" }));
    expect(screen.getByLabelText("Nombre", { exact: true })).toHaveValue("María");
    expect(screen.getByLabelText("Apellidos")).toHaveValue("Prueba-López");
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue("maria@example.com");
    expect(screen.getByLabelText("Número", { exact: true })).toHaveValue("612 345 678");
    expect(screen.getByRole("button", { name: /País y prefijo/ })).toHaveTextContent("España (+34)");
    await user.clear(screen.getByLabelText("Correo electrónico"));
    await user.type(screen.getByLabelText("Correo electrónico"), "maria.nueva@example.com");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByLabelText("Contraseña", { exact: true })).toHaveValue(password);
    expect(screen.getByLabelText("Confirma la contraseña")).toHaveValue(password);
    expect(screen.getByRole("checkbox", { name: "Acepto las condiciones de uso." })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "He leído la política de privacidad." })).toBeChecked();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: 1, email: "maria.nueva@example.com", created_at: "2026-11-09T12:00:00Z" }),
      { status: 201, headers: { "Content-Type": "application/json" } }));
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
    expect(await screen.findByRole("heading", { name: "Inicio de sesión simulado" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ email: "maria.nueva@example.com", password });
  });
});

// US01.9: el compte i l'entitat promotora viatgen en la mateixa petició (backend#68).
describe("Registre amb entitat promotora: `promoting_entity` dins de l'única petició (US01.9)", () => {
  const password = "Password1";
  const promoterCheckbox = () => screen.getByRole("checkbox", { name: /Registrarme como entidad promotora/ });
  const jsonResponse = (body: unknown, status: number) => new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json" },
  });
  // UserRead (backend: app/schemas/auth.py), amb `is_promoter` segons s'hagi creat l'entitat.
  const createdUser = (is_promoter: boolean) => ({
    id: 1, email: "maria@example.com", first_name: "María", last_name: "Prueba-López",
    phone: "+34612345678", created_at: "2026-11-09T12:00:00Z", is_promoter,
  });

  const renderRegister = () => render(<MemoryRouter initialEntries={["/register"]}>
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<h1>Inicio de sesión simulado</h1>} />
    </Routes>
  </MemoryRouter>);

  const fillPersonalDetails = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByLabelText("Nombre", { exact: true }), "María");
    await user.type(screen.getByLabelText("Apellidos"), "Prueba-López");
    await user.type(screen.getByLabelText("Correo electrónico"), "maria@example.com");
    await user.type(screen.getByLabelText("Número", { exact: true }), "612 345 678");
  };

  const fillAccessDetails = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByLabelText("Contraseña", { exact: true }), password);
    await user.type(screen.getByLabelText("Confirma la contraseña"), password);
    await user.click(screen.getByRole("checkbox", { name: "Acepto las condiciones de uso." }));
    await user.click(screen.getByRole("checkbox", { name: "He leído la política de privacidad." }));
  };

  it("envia el compte i l'entitat en una sola petició, bloqueja el formulari i redirigeix al login", async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => { finish = resolve; }));
    const user = userEvent.setup({ delay: null });
    renderRegister();

    await fillPersonalDetails(user);
    await user.click(promoterCheckbox());
    await user.type(screen.getByLabelText("Razón social"), "  Promociones Ejemplo SL  ");
    await user.type(screen.getByLabelText(/Año de fundación/), "2015");
    // La ubicació és opcional i es deixa buida.
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(fetchMock).not.toHaveBeenCalled();
    await fillAccessDetails(user);
    await user.dblClick(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/register");
    expect(options.method).toBe("POST");
    expect(options.credentials).toBe("include");
    expect(options.headers.get("Content-Type")).toBe("application/json");
    // PromotingEntityRegistration: l'any com a enter i la ubicació buida com a null, no com a "".
    expect(JSON.parse(options.body)).toEqual({
      first_name: "María", last_name: "Prueba-López", email: "maria@example.com",
      phone: "+34612345678", password,
      promoting_entity: { legal_name: "Promociones Ejemplo SL", founding_year: 2015, location: null },
    });
    expect(screen.getByRole("button", { name: "Creando cuenta…" })).toBeDisabled();
    expect(screen.getByRole("form", { name: "Crear mi cuenta" })).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("heading", { name: "Inicio de sesión simulado" })).not.toBeInTheDocument();

    await act(async () => finish(jsonResponse(createdUser(true), 201)));

    expect(await screen.findByRole("heading", { name: "Inicio de sesión simulado" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
    // El registre no inicia sessió, tampoc per a una entitat promotora.
    expect(useAuthStore.getState().active_account).toBeNull();
  });

  it("envia la ubicació de l'entitat quan s'ha escrit i l'any com a null quan es deixa buit", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(createdUser(true), 201));
    const user = userEvent.setup({ delay: null });
    renderRegister();

    await fillPersonalDetails(user);
    await user.click(promoterCheckbox());
    await user.type(screen.getByLabelText("Razón social"), "Promociones Ejemplo SL");
    await user.type(screen.getByLabelText(/Ubicación/), " Girona, Girona, España ");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await fillAccessDetails(user);
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByRole("heading", { name: "Inicio de sesión simulado" })).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).promoting_entity).toEqual({
      legal_name: "Promociones Ejemplo SL", founding_year: null, location: "Girona, Girona, España",
    });
  });

  it("en desmarcar la casella no envia `promoting_entity` encara que s'hagin escrit les dades", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(createdUser(false), 201));
    const user = userEvent.setup({ delay: null });
    renderRegister();

    await fillPersonalDetails(user);
    await user.click(promoterCheckbox());
    await user.type(screen.getByLabelText("Razón social"), "Promociones Ejemplo SL");
    await user.type(screen.getByLabelText(/Año de fundación/), "2015");
    await user.click(promoterCheckbox());
    expect(promoterCheckbox()).not.toBeChecked();
    expect(screen.queryByLabelText("Razón social")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await fillAccessDetails(user);
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByRole("heading", { name: "Inicio de sesión simulado" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
    // El mateix cos que un registre normal: sense la clau, no amb null.
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      first_name: "María", last_name: "Prueba-López", email: "maria@example.com",
      phone: "+34612345678", password,
    });
  });

  it("un 422 d'un camp de l'entitat es tradueix, conserva les dades i permet corregir i reintentar", async () => {
    // Error niat de FastAPI: loc = ["body", "promoting_entity", camp]. La validació local ja
    // l'evita; només arriba si el rellotge del navegador va per davant del del servidor.
    fetchMock.mockResolvedValueOnce(jsonResponse({
      detail: [{
        type: "value_error",
        loc: ["body", "promoting_entity", "founding_year"],
        msg: "Value error, L'any de fundació no pot ser posterior a l'any actual",
        input: 2015,
      }],
    }, 422));
    const user = userEvent.setup({ delay: null });
    renderRegister();

    await fillPersonalDetails(user);
    await user.click(promoterCheckbox());
    await user.type(screen.getByLabelText("Razón social"), "Promociones Ejemplo SL");
    await user.type(screen.getByLabelText(/Año de fundación/), "2015");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await fillAccessDetails(user);
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Revisa los siguientes campos: año de fundación.");
    expect(screen.getByRole("alert")).not.toHaveTextContent("L'any de fundació");
    expect(screen.getByLabelText("Contraseña", { exact: true })).toHaveValue(password);
    expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeEnabled();
    expect(screen.queryByRole("heading", { name: "Inicio de sesión simulado" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Volver atrás" }));
    expect(promoterCheckbox()).toBeChecked();
    expect(screen.getByLabelText("Razón social")).toHaveValue("Promociones Ejemplo SL");
    expect(screen.getByLabelText(/Año de fundación/)).toHaveValue("2015");
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue("maria@example.com");
    await user.clear(screen.getByLabelText(/Año de fundación/));
    await user.type(screen.getByLabelText(/Año de fundación/), "2010");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña", { exact: true })).toHaveValue(password);

    fetchMock.mockResolvedValueOnce(jsonResponse(createdUser(true), 201));
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByRole("heading", { name: "Inicio de sesión simulado" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).promoting_entity).toEqual({
      legal_name: "Promociones Ejemplo SL", founding_year: 2010, location: null,
    });
  });

  it("un 409 «Registration conflict» en crear l'entitat no afirma que el correu ja existeixi", async () => {
    // backend/app/api/routes/auth.py: el 409 del correu duplicat és «Email already registered».
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Registration conflict" }, 409));
    const user = userEvent.setup({ delay: null });
    renderRegister();

    await fillPersonalDetails(user);
    await user.click(promoterCheckbox());
    await user.type(screen.getByLabelText("Razón social"), "Promociones Ejemplo SL");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await fillAccessDetails(user);
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se ha podido crear la cuenta. Inténtalo de nuevo en unos instantes.");
    expect(screen.getByRole("alert")).not.toHaveTextContent("Ya existe una cuenta");
    expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
