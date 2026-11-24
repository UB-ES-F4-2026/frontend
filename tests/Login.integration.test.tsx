import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import App from "../src/app/App";
import SessionManager from "../src/components/SessionManager";
import Login from "../src/pages/auth/Login";
import { SESSION_EXPIRED } from "../src/service/api";
import { useAuthStore } from "../src/store/useAuthStore";

// Pàgina, store, router i servei HTTP reals: només simulem fetch, sense cap backend.
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});
// Forma de UserRead (backend: app/schemas/auth.py). Una funció evita compartir l'objecte entre tests.
const account = (is_promoter = false) => ({
  id: 1, email: "ada@example.com", first_name: "Ada", last_name: "Lovelace",
  phone: "+34612345678", created_at: "2026-11-09T12:00:00Z", is_promoter,
});
const requests = () => fetchMock.mock.calls.map(([url, init]) => `${init?.method} ${url}`);

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const EMAIL = "Ada@Example.COM";
// Els espais formen part de la contrasenya: no s'han de retallar.
const PASSWORD = " Password1 ";

const renderLogin = () => render(
  <MemoryRouter initialEntries={["/login"]}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<h1>Inicio simulado</h1>} />
    </Routes>
  </MemoryRouter>,
);

const fillCredentials = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText("Correo electrónico"), EMAIL);
  await user.type(screen.getByLabelText("Contraseña"), PASSWORD);
};

describe("Login: del formulari a POST /api/auth/login", () => {
  it("envia el correu normalitzat una sola vegada, bloqueja el formulari i navega a l'inici", async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => { finish = resolve; }));
    const user = userEvent.setup({ delay: null });
    renderLogin();
    await fillCredentials(user);
    await user.dblClick(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(url).toBe("/api/auth/login");
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("include");
    expect(headers.get("Content-Type")).toBe("application/json");
    // La sessió viatja a la cookie HttpOnly: mai en una capçalera Bearer.
    expect(headers.has("Authorization")).toBe(false);
    expect(JSON.parse(String(init?.body))).toEqual({ email: "ada@example.com", password: PASSWORD });

    // Per text: l'indicador de càrrega afegeix el seu propi nom al del botó.
    expect(screen.getByRole("button", { name: /Iniciando sesión…/ })).toBeDisabled();
    expect(screen.getByRole("form", { name: "Iniciar sesión" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByLabelText("Correo electrónico")).toBeDisabled();
    expect(screen.getByLabelText("Contraseña")).toBeDisabled();
    expect(screen.queryByRole("heading", { name: "Inicio simulado" })).not.toBeInTheDocument();

    await act(async () => { finish(json(account())); });
    expect(await screen.findByRole("heading", { name: "Inicio simulado" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([
    ["un 401 de credencials", () => Promise.resolve(json({ detail: "Incorrect email or password" }, 401)),
      "El correo o la contraseña no son correctos."],
    ["un 422 de validació", () => Promise.resolve(json({ detail: [{
      type: "string_too_long", loc: ["body", "password"], msg: "String should have at most 72 characters",
      input: PASSWORD, ctx: { max_length: 72 },
    }] }, 422)),
      "Revisa el correo y la contraseña. El correo debe ser válido y la contraseña debe ocupar como máximo 72 bytes."],
    // Un error no controlat de FastAPI arriba com a text pla, no com a JSON.
    ["un 500 del servidor", () => Promise.resolve(new Response("Internal Server Error", {
      status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" },
    })), "No se ha podido iniciar sesión. Inténtalo de nuevo en unos instantes."],
    ["un error de xarxa", () => Promise.reject(new TypeError("Failed to fetch")),
      "No se ha podido iniciar sesión. Inténtalo de nuevo en unos instantes."],
  ])("després d'%s conserva les credencials i permet reintentar", async (_case, failure, message) => {
    fetchMock.mockImplementationOnce(failure).mockImplementationOnce(() => Promise.resolve(json(account())));
    // El 401 del login és un error de credencials: no ha de tractar-se com una sessió caducada.
    const sessionExpired = vi.fn();
    window.addEventListener(SESSION_EXPIRED, sessionExpired);
    onTestFinished(() => window.removeEventListener(SESSION_EXPIRED, sessionExpired));
    const user = userEvent.setup({ delay: null });
    renderLogin();
    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(message);
    // Cap dada de la resposta ni la contrasenya arriben al missatge.
    expect(alert).not.toHaveTextContent(PASSWORD.trim());
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue(EMAIL);
    expect(screen.getByLabelText("Contraseña")).toHaveValue(PASSWORD);
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeEnabled();
    expect(screen.queryByRole("heading", { name: "Inicio simulado" })).not.toBeInTheDocument();
    expect(sessionExpired).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(await screen.findByRole("heading", { name: "Inicio simulado" })).toBeInTheDocument();
    expect(requests()).toEqual(["POST /api/auth/login", "POST /api/auth/login"]);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ email: "ada@example.com", password: PASSWORD });
  });
});

// La mateixa composició que src/main.tsx: SessionManager i App dins del router.
describe("Login dins l'aplicació: la resposta decideix la capçalera i l'inici", () => {
  it.each([
    ["sense entitat promotora no ofereix «Mis oportunidades»", false],
    ["amb entitat promotora hi afegeix «Mis oportunidades»", true],
  ])("un compte %s", async (_case, isPromoter) => {
    fetchMock.mockImplementation((url, init) => {
      if (url === "/api/auth/me") return Promise.resolve(json({ detail: "Invalid or missing session" }, 401));
      if (url === "/api/auth/login" && init?.method === "POST") return Promise.resolve(json(account(isPromoter)));
      return Promise.reject(new Error(`Petició inesperada: ${init?.method} ${url}`));
    });
    const user = userEvent.setup({ delay: null });
    render(<MemoryRouter initialEntries={["/"]}><SessionManager /><App /></MemoryRouter>);
    const nav = screen.getByRole("navigation", { name: "Navegación principal" });

    // Visitant: un cop comprovada la sessió, l'inici ofereix el registre.
    expect(await screen.findByRole("link", { name: "Crear cuenta" })).toHaveAttribute("href", "/register");
    await user.click(within(nav).getByRole("link", { name: "Iniciar sesión" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Iniciar sesión" })).toBeInTheDocument();
    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    // La navegació a l'inici pot arribar un render després que la capçalera reconegui la sessió.
    expect(await screen.findByRole("heading", { level: 1, name: /Encuentra tu próxima/ })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Cerrar sesión" })).toBeEnabled();
    expect(within(nav).getByRole("link", { name: "Mi saldo" })).toHaveAttribute("href", "/my-balance");
    expect(within(nav).getByRole("link", { name: "Mis inversiones" })).toHaveAttribute("href", "/my-investments");
    expect(within(nav).queryAllByRole("link", { name: "Mis oportunidades" })).toHaveLength(isPromoter ? 1 : 0);
    expect(within(nav).queryByRole("link", { name: "Iniciar sesión" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Registrarse" })).not.toBeInTheDocument();
    // Amb sessió, l'inici ja no ofereix crear un compte.
    expect(screen.queryByRole("link", { name: "Crear cuenta" })).not.toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Iniciar sesión" })).not.toBeInTheDocument();
    // Iniciar sessió no demana cap dada privada pel seu compte.
    expect(requests()).toEqual(["GET /api/auth/me", "POST /api/auth/login"]);
  });
});
