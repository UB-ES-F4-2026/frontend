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
    const user = userEvent.setup();
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
  }, 15_000);
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
    const user = userEvent.setup();
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
  }, 15_000);
});
