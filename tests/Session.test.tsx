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
    expect(useAuthStore.getState().active_account).toBeNull();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent("/login");
  });

  it("el logout amb sessió ja caducada també acaba al login", async () => {
    fetchMock.mockResolvedValueOnce(json(account));
    await renderSession();
    await userEvent.setup().click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(useAuthStore.getState().active_account).toBeNull();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent("/login");
  });

  it("un error del servidor al logout no es presenta com un tancament correcte", async () => {
    fetchMock.mockResolvedValueOnce(json(account));
    await renderSession();
    fetchMock.mockResolvedValueOnce(json({ detail: "Unavailable" }, 500));
    await userEvent.setup().click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(screen.getByRole("alert")).toHaveTextContent("No se ha podido cerrar sesión");
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
