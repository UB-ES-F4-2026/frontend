import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RealEstateDetail from "../src/pages/opportunities/real-estate/RealEstateDetail";
import { useAuthStore } from "../src/store/useAuthStore";
import { useOpportunityStore } from "../src/store/useOpportunityStore";
import { useWalletStore } from "../src/store/useWalletStore";

// Pàgina, stores i src/service/api.ts reals: només se simula fetch. El mapa del detall és un
// <iframe> d'OpenStreetMap, no react-leaflet, i per això no cal simular res més.
const fetchMock = vi.fn<typeof fetch>();

// Rellotge fix: l'estat del finançament i «Fecha pasada / Fecha futura» depenen de l'hora actual.
const NOW = "2026-11-20T10:00:00Z";

// UserRead (backend: app/schemas/auth.py).
const account = {
  id: 1,
  email: "ada@example.com",
  first_name: "Ada",
  last_name: "Lovelace",
  phone: "+34612345678",
  created_at: "2026-11-09T12:00:00Z",
  is_promoter: false,
};

// RealEstateOpportunityDetailRead tal com el serialitza FastAPI (backend: app/schemas/opportunity.py
// i tests/test_opportunity_detail.py): els Decimal arriben com a text i les dates sense hora com
// a «AAAA-MM-DD». Una funció i no un objecte compartit: cada prova rep la seva còpia.
const realEstateDetail = () => ({
  id: 7,
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
  deadline: "2026-12-31T22:59:00Z",
  date_published: "2026-10-01T09:00:00Z",
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
    estimated_works_end: "2027-06-30",
    estimated_rental_start: "2027-09-01",
    public_latitude: "41.981800",
    public_longitude: "2.823700",
  },
  server_time: NOW,
});

// BusinessOpportunityDetailRead: el mateix endpoint respon amb una altra forma segons el tipus.
const businessDetail = () => ({
  id: 7,
  type: "equity",
  status: "published",
  title: "Expansión de BioPack",
  description: "Primer párrafo.\n\nSegundo párrafo.",
  location: "Valencia, Valencia, España",
  cover_image_url: null,
  images: [],
  target_amount_cents: 30_000_000,
  committed_cents: 18_450_000,
  minimum_contribution_cents: 25_000,
  date_published: "2026-10-01T09:00:00Z",
  deadline: "2026-12-31T22:59:00Z",
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
  server_time: NOW,
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
  // Només el rellotge: els temporitzadors reals segueixen funcionant per a React i Testing Library.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  useOpportunityStore.setState(useOpportunityStore.getInitialState(), true);
  // reset() també cancel·la la consulta de saldo pendent, que setState no coneix.
  useWalletStore.getState().reset();
  useWalletStore.setState(useWalletStore.getInitialState(), true);
  useAuthStore.setState({ active_account: account, status: "success", sessionChecked: true });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const page = (path = "/opportunities/real-estate/7") => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/opportunities/real-estate/:id" element={<RealEstateDetail />} />
      <Route path="/opportunities" element={<h1>Catálogo simulado</h1>} />
      <Route path="/login" element={<h1>Inicio de sesión simulado</h1>} />
    </Routes>
  </MemoryRouter>,
);

describe("Detalle inmobiliario: integración de página, store y API", () => {
  it("pide GET /api/opportunities/7 con la cookie, muestra el esqueleto y pinta la respuesta real del backend", async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => { finish = resolve; }));

    page();

    expect(screen.getByRole("status")).toHaveTextContent("Cargando la oportunidad…");
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/opportunities/7");
    expect(init?.method).toBe("GET");
    expect(init?.credentials).toBe("include");
    expect(init?.body).toBeUndefined();
    expect(init?.signal).toBeInstanceOf(AbortSignal);

    await act(async () => finish(json(realEstateDetail())));

    expect(await screen.findByRole("heading", { level: 1, name: "Piso en Girona" })).toBeInTheDocument();
    expect(screen.queryByText("Cargando la oportunidad…")).not.toBeInTheDocument();
    // El primer paràgraf és l'entradeta; la resta, el resum.
    expect(screen.getByText("Primer párrafo.")).toBeInTheDocument();
    expect(screen.getByText("Segundo párrafo.")).toBeInTheDocument();

    expect(screen.getByText("En financiación")).toBeInTheDocument();
    expect(screen.getByText("45.000,00 €")).toBeInTheDocument();
    expect(screen.getByText("62,5 % del objetivo")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Capital comprometido respecto al objetivo" }))
      .toHaveAttribute("aria-valuenow", "62.5");
    expect(fact("Aportación mínima")).toHaveTextContent("100,00 €");
    expect(screen.getByRole("button", { name: "Quiero invertir" })).toBeEnabled();

    expect(screen.getByText("Promociones Girona SL")).toBeInTheDocument();
    expect(fact("Proyectos publicados")).toHaveTextContent("Proyectos publicados3");
    expect(fact("Años de experiencia")).toHaveTextContent("Años de experiencia8");
    expect(fact("Finalidad")).toHaveTextContent("Adquisición y rehabilitación");
    expect(fact("Uso previsto")).toHaveTextContent("Alquiler");
    // `surface_m2` és un Decimal: arriba com a «950.50», no com a número.
    expect(fact("Superficie")).toHaveTextContent("Superficie950,5 m²");
    expect(fact("Viviendas previstas")).toHaveTextContent("Viviendas previstas12");

    // Les dates sense hora («2027-06-30») es mostren en el mateix dia a l'hora de la plataforma.
    const timeline = within(screen.getByRole("region", { name: "Fechas del proyecto" })).getAllByRole("listitem");
    expect(timeline.map((item) => item.textContent)).toEqual([
      "Publicación1 de octubre de 2026Fecha pasada",
      "Fin de financiación31 de diciembre de 2026Fecha futura",
      "Finalización estimada de las obras30 de junio de 2027Fecha futura",
      "Inicio estimado del alquiler1 de septiembre de 2027Fecha futura",
    ]);

    // Les coordenades també són Decimal: «41.981800» i «2.823700».
    expect(screen.getByTitle("Mapa de la ubicación aproximada"))
      .toHaveAttribute("src", expect.stringContaining("marker=41.9818,2.8237"));
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("omite las fechas y los datos de la entidad que el backend envía como null", async () => {
    const detail = realEstateDetail();
    fetchMock.mockResolvedValue(json({
      ...detail,
      minimum_contribution_cents: null,
      promoter: { ...detail.promoter, experience_years: null, founding_year: null, location: null },
      real_estate: { ...detail.real_estate, estimated_works_end: null, estimated_rental_start: null },
    }));

    page();

    expect(await screen.findByRole("heading", { level: 1, name: "Piso en Girona" })).toBeInTheDocument();
    const timeline = within(screen.getByRole("region", { name: "Fechas del proyecto" })).getAllByRole("listitem");
    expect(timeline.map((item) => item.textContent)).toEqual([
      "Publicación1 de octubre de 2026Fecha pasada",
      "Fin de financiación31 de diciembre de 2026Fecha futura",
    ]);
    expect(screen.queryByText("Aportación mínima")).not.toBeInTheDocument();
    const promoter = screen.getByRole("region", { name: "Entidad promotora" });
    expect(within(promoter).getByText("Promociones Girona SL")).toBeInTheDocument();
    expect(within(promoter).queryByText("Años de experiencia")).not.toBeInTheDocument();
    expect(within(promoter).queryByText("Ubicación")).not.toBeInTheDocument();
  });

  it("muestra el error de carga y «Reintentar» vuelve a pedir el detalle", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ detail: "Service unavailable" }, 503))
      .mockResolvedValueOnce(json(realEstateDetail()));
    const user = userEvent.setup({ delay: null });

    page();

    expect(await screen.findByRole("heading", { level: 1, name: "No se ha podido cargar la oportunidad" })).toBeInTheDocument();
    expect(screen.getByText("Service unavailable (HTTP 503)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quiero invertir" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Piso en Girona" })).toBeInTheDocument();
    expect(requests()).toEqual(["GET /api/opportunities/7", "GET /api/opportunities/7"]);
  });

  it("un error de red también se puede reintentar", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(json(realEstateDetail()));
    const user = userEvent.setup({ delay: null });

    page();

    expect(await screen.findByRole("heading", { level: 1, name: "No se ha podido cargar la oportunidad" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Piso en Girona" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("con un 404 del backend no pinta ningún dato de la oportunidad y permite volver al catálogo", async () => {
    // Detall literal de backend/app/api/routes/opportunities.py quan no és pública o no existeix.
    fetchMock.mockResolvedValue(json({ detail: "Oportunidad no disponible" }, 404));
    const user = userEvent.setup({ delay: null });

    page();

    expect(await screen.findByText(/Oportunidad no disponible/)).toBeInTheDocument();
    expect(requests()).toEqual(["GET /api/opportunities/7"]);
    expect(screen.queryByText("Cargando la oportunidad…")).not.toBeInTheDocument();
    expect(screen.queryByText("Capital comprometido")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quiero invertir" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /Volver a oportunidades/ }));
    expect(screen.getByRole("heading", { name: "Catálogo simulado" })).toBeInTheDocument();
  });

  it("el identificador de una oportunidad empresarial en la ruta inmobiliaria muestra «Oportunidad no encontrada»", async () => {
    fetchMock.mockResolvedValue(json(businessDetail()));

    page();

    expect(await screen.findByRole("heading", { level: 1, name: "Oportunidad no encontrada" })).toBeInTheDocument();
    expect(screen.getByText("Es posible que se haya retirado o que la dirección no sea correcta.")).toBeInTheDocument();
    expect(screen.queryByText("Expansión de BioPack")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Volver a oportunidades/ })).toHaveAttribute("href", "/opportunities");
  });

  it("con un identificador no válido en la ruta no hace ninguna petición", () => {
    page("/opportunities/real-estate/abc");

    expect(screen.getByRole("heading", { level: 1, name: "Oportunidad no encontrada" })).toBeInTheDocument();
    expect(screen.getByText("La dirección no corresponde a ninguna oportunidad inmobiliaria.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
