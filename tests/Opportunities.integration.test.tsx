import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Login from "../src/pages/auth/Login";
import Opportunities from "../src/pages/opportunities/Opportunities";
import BusinessDetail from "../src/pages/opportunities/business/BusinessDetail";
import RealEstateDetail from "../src/pages/opportunities/real-estate/RealEstateDetail";
import { useAuthStore } from "../src/store/useAuthStore";
import { useOpportunityStore } from "../src/store/useOpportunityStore";

const fetchMock = vi.fn();
const opportunity = {
  id: 1,
  user_id: null,
  type: "real_estate" as const,
  title: "Edificio en Girona",
  description: "Rehabilitación de un edificio.",
  location: "Girona",
  cover_image_url: null,
  target_amount_cents: 150_000_000,
  committed_cents: 50_000_000,
  deadline: "2027-12-31T00:00:00Z",
  date_published: "2026-11-01T00:00:00Z",
  date_closed: null,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
};

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

beforeEach(() => {
  useOpportunityStore.setState(useOpportunityStore.getInitialState(), true);
  // Les targetes llegeixen la sessió per decidir si obren el detall.
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

const page = () => render(<MemoryRouter><Opportunities /></MemoryRouter>);

describe("Catàleg d'oportunitats: integració de pàgina, store i API", () => {
  it("carrega el catàleg i envia la cerca real al servei HTTP", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([opportunity]))
      .mockResolvedValueOnce(jsonResponse([]));
    const user = userEvent.setup({ delay: null });

    page();

    expect(await screen.findByText(opportunity.title)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/opportunities", expect.objectContaining({
      method: "GET",
      credentials: "include",
    }));

    await user.type(screen.getByLabelText("Buscar por nombre"), "Girona");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText("No se encontraron oportunidades que coincidan con los criterios de búsqueda.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/opportunities?name=Girona", expect.objectContaining({
      method: "GET",
      credentials: "include",
    }));
  });

  it("muestra el error del backend y permite reintentar sin recrear el store", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: "Catalog unavailable" }, 503))
      .mockResolvedValueOnce(jsonResponse([opportunity]));
    const user = userEvent.setup({ delay: null });

    page();

    expect(await screen.findByText("Catalog unavailable (HTTP 503)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText(opportunity.title)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

const DAY_MS = 86_400_000;

// OpportunityRead tal com el retorna GET /api/opportunities (backend: app/schemas/opportunity.py).
// Les dates es calculen en cridar la funció perquè el termini mai quedi vençut.
const listItem = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  user_id: 10,
  type: "real_estate",
  title: "Piso en Girona",
  description: "Rehabilitación de un piso.",
  location: "Girona, Girona, España",
  cover_image_url: null,
  images: [],
  target_amount_cents: 7_200_000,
  committed_cents: 4_500_000,
  deadline: new Date(Date.now() + 30 * DAY_MS).toISOString(),
  date_published: new Date(Date.now() - 30 * DAY_MS).toISOString(),
  date_closed: null,
  created_at: new Date(Date.now() - 35 * DAY_MS).toISOString(),
  updated_at: new Date(Date.now() - 30 * DAY_MS).toISOString(),
  ...overrides,
});

const piso = () => listItem();
const cervecera = () => listItem({ id: 2, type: "equity", title: "Cervecera artesana en Girona" });

const typeSelect = () => screen.getByRole("button", { name: /Tipo de activo/ });

const selectType = async (user: ReturnType<typeof userEvent.setup>, label: string) => {
  await user.click(typeSelect());
  await user.click(screen.getByRole("option", { name: label }));
};

// Petició número `index` (des de 0), amb la consulta ja separada de la ruta.
const catalogRequest = (index: number) => {
  const [url, options] = fetchMock.mock.calls[index];
  const parsed = new URL(String(url), "http://localhost");
  return {
    path: parsed.pathname,
    name: parsed.searchParams.get("name"),
    type: parsed.searchParams.get("type"),
    method: options?.method,
    credentials: options?.credentials,
  };
};

describe("Catàleg d'oportunitats: filtre per tipus d'actiu (US02.3.2)", () => {
  it("seleccionar «Empresarial» envia type=equity sense prémer «Buscar», mostra l'esquelet i actualitza el recompte", async () => {
    let finish!: (response: Response) => void;
    fetchMock
      .mockResolvedValueOnce(jsonResponse([piso(), cervecera()]))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { finish = resolve; }));
    const user = userEvent.setup({ delay: null });

    page();

    expect(await screen.findByText("2 oportunidades encontradas")).toBeInTheDocument();
    expect(typeSelect()).toHaveTextContent("Todos");
    // Sense filtre no s'envia cap paràmetre.
    expect(fetchMock.mock.calls[0][0]).toBe("/api/opportunities");

    await selectType(user, "Empresarial");

    // Mentre el backend no respon, l'esquelet substitueix les targetes anteriors.
    expect(screen.getByTestId("opportunities-skeleton")).toBeInTheDocument();
    expect(screen.queryByText("Piso en Girona")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const request = catalogRequest(1);
    expect(request.path).toBe("/api/opportunities");
    expect(request.type).toBe("equity");
    // Encara no s'ha cercat res: el nom viatja buit o no viatja, i el backend ho tracta igual.
    expect(request.name ?? "").toBe("");
    expect(request.method).toBe("GET");
    expect(request.credentials).toBe("include");

    await act(async () => finish(jsonResponse([cervecera()])));

    expect(await screen.findByText("1 oportunidades encontradas")).toBeInTheDocument();
    expect(screen.queryByTestId("opportunities-skeleton")).not.toBeInTheDocument();
    expect(screen.getByText("Cervecera artesana en Girona")).toBeInTheDocument();
    expect(screen.queryByText("Piso en Girona")).not.toBeInTheDocument();
    expect(typeSelect()).toHaveTextContent("Empresarial");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("cercar amb un tipus seleccionat envia name i type junts, i canviar el tipus conserva la cerca", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([piso(), cervecera()]))
      .mockResolvedValueOnce(jsonResponse([cervecera()]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([piso()]))
      .mockResolvedValueOnce(jsonResponse([piso(), cervecera()]));
    const user = userEvent.setup({ delay: null });

    page();
    await screen.findByText("2 oportunidades encontradas");
    await selectType(user, "Empresarial");
    await screen.findByText("1 oportunidades encontradas");

    await user.type(screen.getByLabelText("Buscar por nombre"), "piso");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText("No se encontraron oportunidades que coincidan con los criterios de búsqueda.")).toBeInTheDocument();
    expect(screen.getByText("0 oportunidades encontradas")).toBeInTheDocument();
    expect(catalogRequest(2)).toEqual({
      path: "/api/opportunities", name: "piso", type: "equity", method: "GET", credentials: "include",
    });

    await selectType(user, "Inmobiliaria");

    expect(await screen.findByText("Piso en Girona")).toBeInTheDocument();
    expect(catalogRequest(3)).toMatchObject({ path: "/api/opportunities", name: "piso", type: "real_estate" });
    expect(screen.getByLabelText("Buscar por nombre")).toHaveValue("piso");

    // «Todos» no és cap tipus del backend: el paràmetre deixa d'enviar-se.
    await selectType(user, "Todos");

    expect(await screen.findByText("2 oportunidades encontradas")).toBeInTheDocument();
    expect(catalogRequest(4)).toMatchObject({ path: "/api/opportunities", name: "piso", type: null });
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("si el filtre falla, mostra l'error, conserva el tipus i el text escrit i es pot reintentar", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([piso(), cervecera()]))
      .mockResolvedValueOnce(jsonResponse({ detail: "Catalog unavailable" }, 503))
      .mockResolvedValueOnce(jsonResponse([cervecera()]));
    const user = userEvent.setup({ delay: null });

    page();
    await screen.findByText("2 oportunidades encontradas");
    await user.type(screen.getByLabelText("Buscar por nombre"), "cerveza");
    await selectType(user, "Empresarial");

    expect(await screen.findByText("Catalog unavailable (HTTP 503)")).toBeInTheDocument();
    expect(screen.queryByText("Piso en Girona")).not.toBeInTheDocument();
    expect(typeSelect()).toHaveTextContent("Empresarial");
    expect(screen.getByLabelText("Buscar por nombre")).toHaveValue("cerveza");

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Cervecera artesana en Girona")).toBeInTheDocument();
    expect(screen.queryByText("Catalog unavailable (HTTP 503)")).not.toBeInTheDocument();
    // No es comprova la consulta del reintent: avui torna a demanar el catàleg sense filtres
    // encara que el selector segueixi dient «Empresarial» (US02.3.1 CA12, pendent de decidir).
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

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

// PromotingEntityRead: anys, any de fundació i ubicació poden ser null.
const promoter = () => ({
  user_id: 10,
  legal_name: "Promociones Girona SL",
  image_url: null,
  published_projects_count: 3,
  experience_years: 8,
  founding_year: 2018,
  location: "Girona, Girona, España",
});

// Camps comuns de RealEstateOpportunityDetailRead i BusinessOpportunityDetailRead.
const detailBase = (item: ReturnType<typeof listItem>) => ({
  id: item.id,
  type: item.type,
  status: "published",
  title: item.title,
  description: "Primer párrafo.\n\nSegundo párrafo.",
  location: item.location,
  cover_image_url: null,
  images: [],
  target_amount_cents: item.target_amount_cents,
  committed_cents: item.committed_cents,
  minimum_contribution_cents: 10_000,
  deadline: item.deadline,
  date_published: item.date_published,
  promoter: promoter(),
  server_time: new Date().toISOString(),
});

const pisoDetail = () => ({
  ...detailBase(piso()),
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
});

const cerveceraDetail = () => ({
  ...detailBase(cervecera()),
  business: {
    sector: "food_and_beverage",
    phase: "growth",
    pre_investment_valuation_cents: 64_800_000,
    equity_offered: "10.00000000000000000000000000",
  },
});

// Respostes per «MÈTODE ruta»; una petició que no hi és fa fallar la prova amb el seu nom.
const serve = (routes: Record<string, () => Response>) => {
  fetchMock.mockImplementation((url: string, options?: RequestInit) => {
    const route = routes[`${options?.method} ${url}`];
    return route ? Promise.resolve(route()) : Promise.reject(new Error(`Petició inesperada: ${options?.method} ${url}`));
  });
};

const requests = () => fetchMock.mock.calls.map(([url, options]) => `${options?.method} ${url}`);

// Pàgines reals a les mateixes rutes que src/app/App.tsx.
const app = () => render(
  <MemoryRouter initialEntries={["/opportunities"]}>
    <Routes>
      <Route path="/opportunities" element={<Opportunities />} />
      <Route path="/opportunities/real-estate/:id" element={<RealEstateDetail />} />
      <Route path="/opportunities/equity/:id" element={<BusinessDetail />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  </MemoryRouter>,
);

describe("Catàleg d'oportunitats: de la targeta al detall segons el tipus i la sessió", () => {
  it("un visitant que tria una oportunitat immobiliària veu el diàleg d'inici de sessió i no es demana el detall", async () => {
    serve({ "GET /api/opportunities": () => jsonResponse([piso(), cervecera()]) });
    const user = userEvent.setup({ delay: null });

    app();
    await user.click(await screen.findByText("Piso en Girona"));

    const dialog = await screen.findByRole("dialog", { name: "Inicia sesión para ver los detalles" });
    expect(requests()).toEqual(["GET /api/opportunities"]);

    await user.click(within(dialog).getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
    expect(requests()).toEqual(["GET /api/opportunities"]);
  });

  it("un visitant que tria una oportunitat empresarial obre el seu detall sense cap diàleg", async () => {
    serve({
      "GET /api/opportunities": () => jsonResponse([piso(), cervecera()]),
      "GET /api/opportunities/2": () => jsonResponse(cerveceraDetail()),
    });
    const user = userEvent.setup({ delay: null });

    app();
    await user.click(await screen.findByText("Cervecera artesana en Girona"));

    expect(await screen.findByRole("heading", { level: 1, name: "Cervecera artesana en Girona" })).toBeInTheDocument();
    expect(screen.getByText("Condiciones de la inversión")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Iniciar sesión" })).not.toBeInTheDocument();
    expect(requests()).toEqual(["GET /api/opportunities", "GET /api/opportunities/2"]);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/opportunities/2", expect.objectContaining({ credentials: "include" }));
  });

  it("amb la sessió iniciada, la targeta immobiliària obre el detall immobiliari", async () => {
    useAuthStore.setState({ active_account: account, status: "success", sessionChecked: true });
    serve({
      "GET /api/opportunities": () => jsonResponse([piso(), cervecera()]),
      "GET /api/opportunities/1": () => jsonResponse(pisoDetail()),
    });
    const user = userEvent.setup({ delay: null });

    app();
    await user.click(await screen.findByText("Piso en Girona"));

    expect(await screen.findByRole("heading", { level: 1, name: "Piso en Girona" })).toBeInTheDocument();
    expect(screen.getByText("Características del inmueble")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(requests()).toEqual(["GET /api/opportunities", "GET /api/opportunities/1"]);
  });
});
