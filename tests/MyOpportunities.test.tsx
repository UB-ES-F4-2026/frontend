import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyOpportunitiesPage from "../src/pages/my-opportunities/MyOpportunitiesPage";
import { ApiError, fintechGet } from "../src/service/api";
import { useAuthStore } from "../src/store/useAuthStore";
import {
  useOpportunityStore,
  type PromoterOpportunities,
  type PromoterOpportunity,
} from "../src/store/useOpportunityStore";

// Pàgina i stores reals; només simulem les crides a l'API.
vi.mock("../src/service/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/service/api")>(),
  fintechGet: vi.fn(),
  fintechPost: vi.fn(),
}));

const get = vi.mocked(fintechGet);
const promoter = { id: 2, email: "promotora@example.com", created_at: "2026-10-27T10:00:00Z", is_promoter: true };

const opportunity = (overrides: Partial<PromoterOpportunity>): PromoterOpportunity => ({
  id: 1,
  title: "Oportunidad",
  type: "real_estate",
  funding_status: "in_funding",
  target_amount_cents: 10_000_000,
  committed_cents: 0,
  investors_count: 0,
  deadline: "2027-01-31T22:59:00Z",
  date_published: "2026-11-02T09:00:00Z",
  created_at: "2026-11-01T09:00:00Z",
  is_public: true,
  ...overrides,
});

// Les oportunitats del mockup, en l'ordre en què les envia el backend (la més recent primer).
const PENDING = opportunity({
  id: 9,
  title: "Local comercial en Sabadell",
  funding_status: "pending_review",
  target_amount_cents: 15_000_000,
  committed_cents: 500_000,
  investors_count: 1,
  deadline: "2027-01-31T22:59:00Z",
  date_published: null,
  created_at: "2026-11-12T10:00:00Z",
  is_public: false,
});
const IN_FUNDING = opportunity({
  id: 7,
  title: "Piso en Girona",
  target_amount_cents: 7_200_000,
  committed_cents: 4_510_000,
  investors_count: 14,
  deadline: "2026-12-15T22:59:00Z",
  date_published: "2026-11-02T09:00:00Z",
});
const FUNDED = opportunity({
  id: 3,
  title: "Rehabilitación de edificio en Lleida",
  funding_status: "funded",
  target_amount_cents: 40_000_000,
  committed_cents: 40_000_000,
  investors_count: 120,
  deadline: "2026-11-30T22:59:00Z",
  date_published: "2026-10-20T09:00:00Z",
});
const EXPIRED = opportunity({
  id: 4,
  title: "Nave logística en Reus",
  funding_status: "expired",
  target_amount_cents: 20_000_000,
  committed_cents: 3_000_000,
  investors_count: 9,
  deadline: "2026-10-31T22:59:00Z",
  date_published: "2026-09-01T09:00:00Z",
});

const MOCKUP: PromoterOpportunities = {
  summary: { committed_cents: 47_510_000, published_count: 3, in_funding_count: 1, pending_review_count: 1 },
  opportunities: [PENDING, IN_FUNDING, FUNDED, EXPIRED],
};

const EMPTY: PromoterOpportunities = {
  summary: { committed_cents: 0, published_count: 0, in_funding_count: 0, pending_review_count: 0 },
  opportunities: [],
};

let response: PromoterOpportunities | Error;

function CurrentPath() {
  return <output aria-label="Ruta actual">{useLocation().pathname}</output>;
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/my-opportunities"]}>
      <Routes>
        <Route path="/my-opportunities" element={<MyOpportunitiesPage />} />
        <Route path="/opportunities/real-estate/:id" element={<h1>Detalle inmobiliario</h1>} />
        <Route path="/opportunities/equity/:id" element={<h1>Detalle empresarial</h1>} />
      </Routes>
      <CurrentPath />
    </MemoryRouter>,
  );

const stat = (label: string) => within(screen.getByLabelText("Resumen")).getByText(label).nextElementSibling;

beforeEach(() => {
  vi.resetAllMocks();
  useOpportunityStore.setState(useOpportunityStore.getInitialState(), true);
  useAuthStore.setState({ active_account: promoter, sessionChecked: true });
  response = MOCKUP;
  get.mockImplementation(async (url: string) => {
    if (url === "/me/opportunities") {
      if (response instanceof Error) throw response;
      return response;
    }
    if (url === "/promotingentity") {
      return [
        { user_id: 1, legal_name: "Otra Entidad SL" },
        { user_id: 2, legal_name: "Promociones Ejemplo SL" },
      ];
    }
    throw new Error(`Petició inesperada: ${url}`);
  });
});

describe("Mis oportunidades: resum", () => {
  it("consulta les oportunitats de l'entitat i mostra el seu nom", async () => {
    renderPage();

    expect(await screen.findByText("Promociones Ejemplo SL")).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("/me/opportunities", expect.anything());
    expect(screen.queryByText("Otra Entidad SL")).not.toBeInTheDocument();
  });

  it("mostra el capital compromès, les publicades, les que estan en finançament i les pendents", async () => {
    renderPage();
    await screen.findByText("Piso en Girona");

    expect(stat("Capital comprometido")).toHaveTextContent("475.100,00 €");
    expect(stat("Oportunidades publicadas")).toHaveTextContent("3");
    expect(stat("En financiación")).toHaveTextContent("1");
    expect(stat("Pendientes de revisión")).toHaveTextContent("1");
  });

  it("es mostra encara que no es pugui consultar el nom de l'entitat", async () => {
    get.mockImplementation(async (url: string) => {
      if (url === "/me/opportunities") return MOCKUP;
      throw new ApiError("Internal Server Error", 500, null);
    });
    renderPage();

    expect(await screen.findByText("Piso en Girona")).toBeInTheDocument();
    expect(screen.queryByText("Promociones Ejemplo SL")).not.toBeInTheDocument();
  });
});

describe("Mis oportunidades: llista", () => {
  it("mostra les oportunitats en l'ordre del backend, de la més recent a la més antiga", async () => {
    renderPage();
    await screen.findByText("Piso en Girona");

    expect(screen.getAllByRole("article").map((item) => within(item).getByRole("heading").textContent)).toEqual([
      "Local comercial en Sabadell",
      "Piso en Girona",
      "Rehabilitación de edificio en Lleida",
      "Nave logística en Reus",
    ]);
  });

  it("mostra el tipus, la data de publicació, l'estat, el progrés, els inversors i la data límit", async () => {
    renderPage();
    const item = await screen.findByRole("article", { name: "Piso en Girona" });

    expect(item).toHaveTextContent("Inmobiliaria");
    expect(item).toHaveTextContent(/Publicada el 2 nov\.? 2026/);
    expect(item).toHaveTextContent("En financiación");
    expect(item).toHaveTextContent("45.100,00 € de 72.000,00 € · 62,6 %");
    expect(within(item).getByRole("progressbar", { name: "Financiación" })).toHaveAttribute("aria-valuenow", "63");
    expect(within(item).getByText("Inversores").nextElementSibling).toHaveTextContent(/^14$/);
    expect(within(item).getByText("Fecha límite").nextElementSibling).toHaveTextContent(/^15 dic\.? 2026$/);
  });

  it.each([
    ["Rehabilitación de edificio en Lleida", "Financiación completada"],
    ["Nave logística en Reus", "Plazo finalizado"],
    ["Local comercial en Sabadell", "Pendiente de revisión"],
  ])("«%s» continua a la llista amb l'indicador «%s»", async (title, label) => {
    renderPage();

    expect(within(await screen.findByRole("article", { name: title })).getByText(label)).toBeInTheDocument();
  });

  it("una oportunitat tancada mostra «Oportunidad cerrada»", async () => {
    response = {
      summary: { committed_cents: 1_000_000, published_count: 1, in_funding_count: 0, pending_review_count: 0 },
      opportunities: [opportunity({ id: 5, type: "equity", title: "Cervecera artesana en Girona", funding_status: "closed" })],
    };
    renderPage();

    const item = await screen.findByRole("article", { name: "Cervecera artesana en Girona" });
    expect(item).toHaveTextContent("Oportunidad cerrada");
    expect(item).toHaveTextContent("Empresarial");
  });

  it("la pendent de revisió mostra la data de creació i no té enllaç al detall", async () => {
    renderPage();
    const item = await screen.findByRole("article", { name: "Local comercial en Sabadell" });

    expect(item).toHaveTextContent(/Creada el 12 nov\.? 2026/);
    expect(within(item).queryByRole("link")).not.toBeInTheDocument();
  });

  it("la barra de progrés no passa del 100 %", async () => {
    response = {
      ...MOCKUP,
      opportunities: [opportunity({ title: "Sobrefinanciada", funding_status: "funded", target_amount_cents: 100, committed_cents: 150 })],
    };
    renderPage();

    const item = await screen.findByRole("article", { name: "Sobrefinanciada" });
    expect(within(item).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});

describe("Mis oportunidades: anar al detall", () => {
  it("el títol obre el detall immobiliari", async () => {
    const user = userEvent.setup();
    renderPage();

    const link = within(await screen.findByRole("article", { name: "Piso en Girona" })).getByRole("link", { name: "Piso en Girona" });
    expect(link).toHaveAttribute("href", "/opportunities/real-estate/7");
    await user.click(link);

    expect(screen.getByRole("heading", { name: "Detalle inmobiliario" })).toBeInTheDocument();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/opportunities\/real-estate\/7$/);
  });

  it("el títol d'una empresarial obre el seu detall", async () => {
    response = {
      ...MOCKUP,
      opportunities: [opportunity({ id: 5, type: "equity", title: "Cervecera artesana en Girona" })],
    };
    renderPage();

    const item = await screen.findByRole("article", { name: "Cervecera artesana en Girona" });
    expect(within(item).getByRole("link")).toHaveAttribute("href", "/opportunities/equity/5");
  });
});

describe("Mis oportunidades: sense oportunitats publicades", () => {
  it("mostra «Aún no has publicado ninguna oportunidad» sense resum ni llista", async () => {
    response = EMPTY;
    renderPage();

    expect(await screen.findByRole("heading", { name: "Aún no has publicado ninguna oportunidad" })).toBeInTheDocument();
    expect(screen.queryByText("Capital comprometido")).not.toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("si només n'hi ha de pendents de revisió, també les llista", async () => {
    response = {
      summary: { committed_cents: 0, published_count: 0, in_funding_count: 0, pending_review_count: 1 },
      opportunities: [PENDING],
    };
    renderPage();

    expect(await screen.findByRole("heading", { name: "Aún no has publicado ninguna oportunidad" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Local comercial en Sabadell" })).toBeInTheDocument();
    expect(stat("Pendientes de revisión")).toHaveTextContent("1");
  });

  it("amb oportunitats publicades no mostra el missatge", async () => {
    renderPage();
    await screen.findByText("Piso en Girona");

    expect(screen.queryByText("Aún no has publicado ninguna oportunidad")).not.toBeInTheDocument();
  });
});

describe("Mis oportunidades: càrrega i errors", () => {
  it("indica que s'estan carregant les oportunitats", () => {
    get.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText("Cargando tus oportunidades…")).toBeInTheDocument();
  });

  it("si la consulta falla, mostra l'error i permet tornar-ho a provar", async () => {
    const user = userEvent.setup();
    response = new ApiError("Internal Server Error", 500, null);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se han podido cargar tus oportunidades.");
    response = MOCKUP;
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Piso en Girona")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("si el backend no reconeix l'entitat promotora (403), mostra l'avís de secció reservada", async () => {
    response = new ApiError("A promoting entity is required", 403, null);
    renderPage();

    expect(await screen.findByRole("heading", { name: "Sección solo para entidades promotoras" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");
  });

  it("manté el botó «Crear oportunidad» (US06.1)", async () => {
    renderPage();

    expect(await screen.findByRole("button", { name: "Crear oportunidad" })).toBeInTheDocument();
  });
});
