import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SessionManager from "../src/components/SessionManager";
import Header from "../src/components/Header";
import { ApiError, fintechGet, fintechPost } from "../src/service/api";
import { useAuthStore } from "../src/store/useAuthStore";

// API, store i navegació reals; només simulem la xarxa, sense crear comptes.
const fetchMock = vi.fn();
const account = { id: 1, email: "user@example.com", created_at: "2026-10-27T10:00:00Z" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});
function Location() {
  return <output aria-label="Ruta actual">{useLocation().pathname}</output>;
}
async function renderSession() {
  render(<MemoryRouter initialEntries={["/opportunities"]}>
    <SessionManager /><Header /><Location />
  </MemoryRouter>);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  // Esperem la comprovació inicial abans de començar l’acció del test.
  await act(async () => {});
}
beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  fetchMock.mockReset().mockImplementation(() => Promise.resolve(json({ detail: "Invalid or missing session" }, 401)));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("TR05: sessió amb cookie", () => {
  it("recupera l’usuari amb /me i envia les credencials", async () => {
    fetchMock.mockResolvedValueOnce(json(account));
    await renderSession();
    expect(useAuthStore.getState().active_account).toEqual(account);
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Iniciar sesión" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Registrarse" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/me", expect.objectContaining({ credentials: "include" }));
  });

  it("manté el visitant a la pàgina pública si no té sessió", async () => {
    await renderSession();
    expect(useAuthStore.getState().active_account).toBeNull();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent("/opportunities");
  });

  it("el login guarda l’usuari sense token ni capçalera Bearer", async () => {
    fetchMock.mockResolvedValueOnce(json(account));
    await useAuthStore.getState().login({ email: account.email, password: "password123" });
    expect(useAuthStore.getState().active_account).toEqual(account);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/login");
    expect(options.credentials).toBe("include");
    expect(options.headers.has("Authorization")).toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("un 401 protegit neteja la sessió i redirigeix sense cridar logout", async () => {
    fetchMock.mockResolvedValueOnce(json(account));
    await renderSession();
    await act(async () => {
      await expect(fintechGet("/auth/me")).rejects.toBeInstanceOf(ApiError);
    });
    expect(useAuthStore.getState().active_account).toBeNull();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent("/login");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("un 401 del login conserva el missatge de credencials incorrectes", async () => {
    await renderSession();
    await act(async () => {
      await useAuthStore.getState().login({ email: account.email, password: "incorrecta" });
    });
    expect(useAuthStore.getState().details).toContain("no son correctos");
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent("/opportunities");
  });

  it("el botó logout crida l’endpoint amb cookie, neteja i redirigeix", async () => {
    fetchMock.mockResolvedValueOnce(json(account));
    await renderSession();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await userEvent.setup().click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(fetchMock).toHaveBeenLastCalledWith("/api/auth/logout", expect.objectContaining({ method: "POST", credentials: "include" }));
    // El logout és asíncron: esperem el resultat en lloc de suposar que ja ha acabat.
    await waitFor(() => expect(screen.getByLabelText("Ruta actual")).toHaveTextContent("/login"));
    expect(useAuthStore.getState().active_account).toBeNull();
  });

  it("el logout amb sessió ja caducada també acaba al login", async () => {
    fetchMock.mockResolvedValueOnce(json(account));
    await renderSession();
    await userEvent.setup().click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(screen.getByLabelText("Ruta actual")).toHaveTextContent("/login"));
    expect(useAuthStore.getState().active_account).toBeNull();
  });

  it("un error del servidor al logout no es presenta com un tancament correcte", async () => {
    fetchMock.mockResolvedValueOnce(json(account));
    await renderSession();
    fetchMock.mockResolvedValueOnce(json({ detail: "Unavailable" }, 500));
    await userEvent.setup().click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se ha podido cerrar sesión");
    expect(useAuthStore.getState().active_account).toEqual(account);
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent("/opportunities");
  });

  it("les respostes correctes i els errors 500 no tanquen la sessió", async () => {
    fetchMock.mockResolvedValueOnce(json(account));
    await renderSession();
    fetchMock.mockResolvedValueOnce(json({ ok: true }));
    await fintechPost("/example", {});
    fetchMock.mockResolvedValueOnce(json({ detail: "Unavailable" }, 500));
    await expect(fintechGet("/example")).rejects.toMatchObject({ status: 500 });
    expect(useAuthStore.getState().active_account).toEqual(account);
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent("/opportunities");
  });

  it("una recuperació tardana no reobre una sessió que ja s’ha netejat", async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((done) => { resolve = done; }));
    const pending = useAuthStore.getState().restoreSession(new AbortController().signal);
    useAuthStore.getState().clearSession();
    resolve(json(account));
    await pending;
    expect(useAuthStore.getState().active_account).toBeNull();
  });
});

describe("Sessió: càrrega i errors recuperables", () => {
  it("un error de xarxa en comprovar la sessió deixa el visitant on era, sense cap avís", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await renderSession();
    expect(useAuthStore.getState().active_account).toBeNull();
    // La comprovació es dona per acabada: les rutes privades ja poden decidir.
    expect(useAuthStore.getState().sessionChecked).toBe(true);
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent("/opportunities");
  });

  it("tancar sessió bloqueja el botó mentre espera i envia un sol POST sense cos", async () => {
    fetchMock.mockResolvedValueOnce(json(account));
    await renderSession();
    let finish!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((done) => { finish = done; }));
    await userEvent.setup().dblClick(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, options] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/auth/logout");
    expect(options.method).toBe("POST");
    expect(options.credentials).toBe("include");
    expect(options.body).toBeUndefined();
    // Fins que el servidor no ho confirma, la sessió continua oberta.
    expect(useAuthStore.getState().active_account).toEqual(account);
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent("/opportunities");

    await act(async () => { finish(new Response(null, { status: 204 })); });
    await waitFor(() => expect(screen.getByLabelText("Ruta actual")).toHaveTextContent("/login"));
    expect(screen.getByRole("link", { name: "Registrarse" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("si el logout falla per xarxa conserva la sessió i es pot tornar a provar", async () => {
    fetchMock.mockResolvedValueOnce(json(account));
    await renderSession();
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se ha podido cerrar sesión. Inténtalo de nuevo.");
    expect(useAuthStore.getState().active_account).toEqual(account);
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent("/opportunities");
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeEnabled();

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(screen.getByLabelText("Ruta actual")).toHaveTextContent("/login"));
    expect(useAuthStore.getState().active_account).toBeNull();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
