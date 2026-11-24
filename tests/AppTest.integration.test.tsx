import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppTest from "../src/pages/test/AppTest";
import { useHealthStore } from "../src/store/useHealthStore";

// Pàgina de diagnòstic, store i src/service/api.ts reals: només se simula fetch. La pàgina no
// fa servir el router.
const fetchMock = vi.fn<typeof fetch>();

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

// Les dues úniques respostes de GET /api/health (backend: app/main.py).
const healthy = () => json({ status: "ok", service: "backend", database: "ok" });
const databaseDown = () => json({ detail: "Database unavailable" }, 503);

const requests = () => fetchMock.mock.calls.map(([url, init]) => `${init?.method} ${String(url)}`);

// Valor al costat de l'etiqueta de cada targeta d'estat.
const tile = (label: string) => screen.getByText(label).parentElement;

beforeEach(() => {
  useHealthStore.setState(useHealthStore.getInitialState(), true);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe("Comprobación del entorno: integración de página, store y API", () => {
  it("pide GET /api/health, bloquea el botón mientras espera y muestra el servicio y la base de datos", async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => { finish = resolve; }));

    render(<AppTest />);

    expect(screen.getByText("Comprobando conexión…")).toBeInTheDocument();
    expect(screen.getByText("Conectando")).toBeInTheDocument();
    // El nom accessible també inclou l'indicador de càrrega, d'aquí l'expressió regular.
    expect(screen.getByRole("button", { name: /Comprobando…/ })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/health");
    expect(init?.method).toBe("GET");
    expect(init?.credentials).toBe("include");
    expect(init?.signal).toBeInstanceOf(AbortSignal);

    await act(async () => finish(healthy()));

    expect(await screen.findByText("Conexión correcta con el backend")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(tile("Servicio Backend")).toHaveTextContent("backend");
    expect(tile("Estado API")).toHaveTextContent("Operativo");
    expect(tile("Base de Datos")).toHaveTextContent("Conectada");
    expect(screen.queryByText("Detalles de la respuesta")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Volver a comprobar" })).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("con la base de datos caída (503) muestra el detalle del backend y «Volver a comprobar» repite la consulta", async () => {
    fetchMock.mockResolvedValueOnce(databaseDown()).mockResolvedValueOnce(healthy());
    const user = userEvent.setup({ delay: null });

    render(<AppTest />);

    expect(await screen.findByText("No se ha podido conectar con el backend")).toBeInTheDocument();
    expect(screen.getByText("Offline")).toBeInTheDocument();
    expect(screen.getByText("Database unavailable (HTTP 503)")).toBeInTheDocument();
    expect(tile("Servicio Backend")).toHaveTextContent("No disponible");
    expect(tile("Estado API")).toHaveTextContent("Inactivo");
    expect(tile("Base de Datos")).toHaveTextContent("Sin conexión");

    await user.click(screen.getByRole("button", { name: "Volver a comprobar" }));

    expect(await screen.findByText("Online")).toBeInTheDocument();
    expect(tile("Base de Datos")).toHaveTextContent("Conectada");
    expect(screen.queryByText("Database unavailable (HTTP 503)")).not.toBeInTheDocument();
    expect(requests()).toEqual(["GET /api/health", "GET /api/health"]);
  });
});
