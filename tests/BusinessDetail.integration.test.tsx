import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BusinessDetail from "../src/pages/opportunities/business/BusinessDetail";
import { useAuthStore } from "../src/store/useAuthStore";
import { useOpportunityStore } from "../src/store/useOpportunityStore";
import { useWalletStore } from "../src/store/useWalletStore";

// Pàgina, stores i src/service/api.ts reals: només se simula fetch. El visitant és l'estat
// inicial del store d'autenticació, sense cap compte.
const fetchMock = vi.fn<typeof fetch>();

const DAY_MS = 86_400_000;

// BusinessOpportunityDetailRead tal com el serialitza FastAPI (backend: app/schemas/opportunity.py):
// `equity_offered` és un Decimal i arriba com a text; l'entitat pot no tenir anys ni ubicació.
// Les dates es calculen en cridar la funció perquè el termini mai quedi vençut.
const businessDetail = () => ({
  id: 44,
  type: "equity",
  status: "published",
  title: "Expansión de BioPack",
  description: "BioPack fabrica envases compostables.\n\nLa ronda financia una segunda línea de producción.",
  location: "Valencia, Valencia, España",
  cover_image_url: null,
  images: [],
  target_amount_cents: 30_000_000,
  committed_cents: 18_450_000,
  minimum_contribution_cents: 25_000,
  date_published: new Date(Date.now() - 30 * DAY_MS).toISOString(),
  deadline: new Date(Date.now() + 30 * DAY_MS).toISOString(),
  promoter: {
    user_id: 10,
    legal_name: "BioPack Solutions SL",
    image_url: null,
    published_projects_count: 2,
    experience_years: null,
    founding_year: null,
    location: null,
  },
  business: {
    sector: "food_and_beverage",
    phase: "growth",
    pre_investment_valuation_cents: 270_000_000,
    equity_offered: "10.00000000000000000000000000",
  },
  server_time: new Date().toISOString(),
});

// RealEstateOpportunityDetailRead: el mateix endpoint respon amb una altra forma segons el tipus.
const realEstateDetail = () => ({
  id: 44,
  type: "real_estate",
  status: "published",
  title: "Piso en Girona",
  description: "Primer párrafo.\n\nSegundo párrafo.",
  location: "Girona, Girona, España",
  cover_image_url: null,
  images: [],
  target_amount_cents: 7_200_000,
  committed_cents: 4_500_000,
  minimum_contribution_cents: 10_000,
  deadline: new Date(Date.now() + 30 * DAY_MS).toISOString(),
  date_published: new Date(Date.now() - 30 * DAY_MS).toISOString(),
  promoter: {
    user_id: 10,
    legal_name: "Promociones Girona SL",
    image_url: null,
    published_projects_count: 3,
    experience_years: 8,
    founding_year: 2018,
    location: "Girona, Girona, España",
  },
  real_estate: {
    purpose: "acquisition_and_renovation",
    intended_use: "rental",
    asset_type: "residential",
    surface_m2: "950.50",
    planned_housing_units: 12,
    estimated_works_end: null,
    estimated_rental_start: null,
    public_latitude: "41.981800",
    public_longitude: "2.823700",
  },
  server_time: new Date().toISOString(),
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

// «MÈTODE ruta» de cada petició, en ordre.
const requests = () => fetchMock.mock.calls.map(([url, init]) => `${init?.method} ${String(url)}`);

// Etiqueta i valor d'una dada del detall (<dt> i <dd> dins del mateix bloc).
const fact = (label: string) => screen.getByText(label).parentElement;

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  useOpportunityStore.setState(useOpportunityStore.getInitialState(), true);
  // reset() també cancel·la la consulta de saldo pendent, que setState no coneix.
  useWalletStore.getState().reset();
  useWalletStore.setState(useWalletStore.getInitialState(), true);
  // La comprovació inicial de sessió ja ha acabat i no hi ha compte: un visitant.
  useAuthStore.setState({ sessionChecked: true });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

const page = () => render(
  <MemoryRouter initialEntries={["/opportunities/equity/44"]}>
    <Routes>
      <Route path="/opportunities/equity/:id" element={<BusinessDetail />} />
      <Route path="/opportunities" element={<h1>Catálogo simulado</h1>} />
      <Route path="/login" element={<h1>Inicio de sesión simulado</h1>} />
    </Routes>
  </MemoryRouter>,
);

describe("Detalle empresarial: integración de página, store y API", () => {
  it("un visitante abre el detalle sin sesión y ve los datos de la empresa que envía el backend", async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => { finish = resolve; }));

    page();

    expect(screen.getByRole("status")).toHaveTextContent("Cargando la oportunidad…");
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/opportunities/44");
    expect(init?.method).toBe("GET");
    expect(init?.credentials).toBe("include");
    expect(init?.body).toBeUndefined();

    await act(async () => finish(json(businessDetail())));

    expect(await screen.findByRole("heading", { level: 1, name: "Expansión de BioPack" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Inicio de sesión simulado" })).not.toBeInTheDocument();
    expect(screen.getByText("BioPack fabrica envases compostables.")).toBeInTheDocument();
    expect(screen.getByText("La ronda financia una segunda línea de producción.")).toBeInTheDocument();

    expect(screen.getByText("En financiación")).toBeInTheDocument();
    expect(screen.getByText("184.500,00 €")).toBeInTheDocument();
    expect(screen.getByText("61,5 % del objetivo")).toBeInTheDocument();
    expect(fact("Aportación mínima")).toHaveTextContent("250,00 €");
    expect(screen.getByRole("button", { name: "Quiero invertir" })).toBeEnabled();

    expect(fact("Sector")).toHaveTextContent("SectorAlimentación y bebidas");
    expect(fact("Fase de la empresa")).toHaveTextContent("Fase de la empresaCrecimiento");
    expect(screen.getByRole("region", { name: "Condiciones de la inversión" })).toBeInTheDocument();
    expect(fact("Valoración previa a la inversión")).toHaveTextContent("2.700.000,00 €");
    // `equity_offered` arriba com a text amb tots els decimals del Decimal.
    expect(fact("Participación ofrecida")).toHaveTextContent("10,0 %");

    // Només té les fites comunes: cap data d'obres ni de lloguer.
    const timeline = within(screen.getByRole("region", { name: "Fechas del proyecto" })).getAllByRole("listitem");
    expect(timeline).toHaveLength(2);
    expect(timeline[0]).toHaveTextContent(/^Publicación.*Fecha pasada$/);
    expect(timeline[1]).toHaveTextContent(/^Fin de financiación.*Fecha futura$/);

    // Sense les seccions pròpies d'un immoble, ni mapa.
    expect(screen.queryByText("Características del inmueble")).not.toBeInTheDocument();
    expect(screen.queryByText("Ubicación aproximada")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Mapa de la ubicación aproximada")).not.toBeInTheDocument();
    expect(screen.queryByText("Mapa no disponible")).not.toBeInTheDocument();

    // Dades opcionals de l'entitat que el backend envia com a null.
    const promoter = screen.getByRole("region", { name: "Entidad promotora" });
    expect(within(promoter).getByText("BioPack Solutions SL")).toBeInTheDocument();
    expect(within(promoter).getByText("Proyectos publicados").parentElement).toHaveTextContent("Proyectos publicados2");
    expect(within(promoter).queryByText("Años de experiencia")).not.toBeInTheDocument();
    expect(within(promoter).queryByText("Ubicación")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("sin sesión, «Quiero invertir» lleva al inicio de sesión sin ninguna petición más", async () => {
    fetchMock.mockResolvedValue(json(businessDetail()));
    const user = userEvent.setup({ delay: null });

    page();
    await user.click(await screen.findByRole("button", { name: "Quiero invertir" }));

    expect(screen.getByRole("heading", { name: "Inicio de sesión simulado" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Ni el saldo ni el compromís: el visitant no arriba a obrir el diàleg.
    expect(requests()).toEqual(["GET /api/opportunities/44"]);
  });

  it("muestra el error de carga y «Reintentar» vuelve a pedir el detalle", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ detail: "Service unavailable" }, 503))
      .mockResolvedValueOnce(json(businessDetail()));
    const user = userEvent.setup({ delay: null });

    page();

    expect(await screen.findByRole("heading", { level: 1, name: "No se ha podido cargar la oportunidad" })).toBeInTheDocument();
    expect(screen.getByText("Service unavailable (HTTP 503)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quiero invertir" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Expansión de BioPack" })).toBeInTheDocument();
    expect(requests()).toEqual(["GET /api/opportunities/44", "GET /api/opportunities/44"]);
  });

  it("el identificador de una oportunidad inmobiliaria en la ruta empresarial muestra «Oportunidad no encontrada»", async () => {
    fetchMock.mockResolvedValue(json(realEstateDetail()));

    page();

    expect(await screen.findByRole("heading", { level: 1, name: "Oportunidad no encontrada" })).toBeInTheDocument();
    expect(screen.getByText("Es posible que se haya retirado o que la dirección no sea correcta.")).toBeInTheDocument();
    expect(screen.queryByText("Piso en Girona")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Volver a oportunidades/ })).toHaveAttribute("href", "/opportunities");
  });
});
