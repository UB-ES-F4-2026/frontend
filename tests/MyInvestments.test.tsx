import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyInvestmentsPage from "../src/pages/investments/MyInvestmentsPage";
import { ApiError, fintechGet } from "../src/service/api";
import {
  useInvestmentStore,
  type Investment,
  type InvestmentOpportunity,
  type Investments,
} from "../src/store/useInvestmentStore";

// Pàgina i store reals; només simulem les crides a l'API.
vi.mock("../src/service/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/service/api")>(),
  fintechGet: vi.fn(),
}));

const get = vi.mocked(fintechGet);

const investment = (
  overrides: Partial<Omit<Investment, "opportunity">>,
  opportunity: Partial<InvestmentOpportunity> = {},
): Investment => ({
  id: 1,
  amount_cents: 10_000,
  created_at: "2026-11-11T10:00:00Z",
  estimated_equity: null,
  ...overrides,
  opportunity: {
    id: 7,
    title: "Piso en Girona",
    type: "real_estate",
    funding_status: "in_funding",
    target_amount_cents: 7_200_000,
    committed_cents: 4_510_000,
    deadline: "2026-12-15T22:59:00Z",
    is_public: true,
    ...opportunity,
  },
});

// Les inversions del mockup, en l'ordre en què les envia el backend (la més recent primer).
const BIOPACK = investment(
  { id: 31, amount_cents: 100_000, created_at: "2026-11-12T10:00:00Z", estimated_equity: "0.03333333333333333333333333333" },
  { id: 44, title: "Expansión de BioPack: envases compostables", type: "equity", target_amount_cents: 30_000_000, committed_cents: 18_550_000 },
);
const GIRONA = investment({ id: 30, amount_cents: 10_000, created_at: "2026-11-11T10:00:00Z" });
const LLEIDA = investment(
  { id: 29, amount_cents: 50_000, created_at: "2026-11-03T10:00:00Z" },
  { id: 3, title: "Rehabilitación de edificio en Lleida", funding_status: "funded", target_amount_cents: 40_000_000, committed_cents: 40_000_000 },
);

const MOCKUP: Investments = {
  summary: { total_committed_cents: 160_000, commitments_count: 3, in_funding_count: 2 },
  commitments: [BIOPACK, GIRONA, LLEIDA],
};

const only = (...commitments: Investment[]): Investments => ({
  summary: { total_committed_cents: 0, commitments_count: commitments.length, in_funding_count: 0 },
  commitments,
});

let response: Investments | Error;

function CurrentPath() {
  return <output aria-label="Ruta actual">{useLocation().pathname}</output>;
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/my-investments"]}>
      <Routes>
        <Route path="/my-investments" element={<MyInvestmentsPage />} />
        <Route path="/opportunities" element={<h1>Catálogo</h1>} />
        <Route path="/opportunities/real-estate/:id" element={<h1>Detalle inmobiliario</h1>} />
        <Route path="/opportunities/equity/:id" element={<h1>Detalle empresarial</h1>} />
      </Routes>
      <CurrentPath />
    </MemoryRouter>,
  );

const stat = (label: string) => within(screen.getByLabelText("Resumen")).getByText(label).nextElementSibling;
const cards = () => screen.getAllByRole("article");

beforeEach(() => {
  vi.resetAllMocks();
  useInvestmentStore.setState(useInvestmentStore.getInitialState(), true);
  response = MOCKUP;
  get.mockImplementation(async (url: string) => {
    if (url !== "/me/commitments") throw new Error(`Petició inesperada: ${url}`);
    if (response instanceof Error) throw response;
    return response;
  });
});

describe("Mis inversiones: resum", () => {
  it("mostra el total compromès, el nombre d'inversions i les que estan en finançament", async () => {
    renderPage();
    await screen.findByText("Piso en Girona");

    expect(get).toHaveBeenCalledWith("/me/commitments", expect.anything());
    expect(stat("Total comprometido")).toHaveTextContent("1.600,00 €");
    expect(stat("Inversiones")).toHaveTextContent("3");
    expect(stat("En financiación")).toHaveTextContent("2");
  });

  it("indica que és un entorn de simulació", async () => {
    renderPage();

    expect(screen.getByText("Entorno de simulación. Estos importes no representan dinero real.")).toBeInTheDocument();
  });
});

describe("Mis inversiones: llista", () => {
  it("mostra cada inversió en l'ordre del backend, de la més recent a la més antiga", async () => {
    renderPage();
    await screen.findByText("Piso en Girona");

    expect(cards().map((card) => within(card).getByRole("heading").textContent)).toEqual([
      "Expansión de BioPack: envases compostables",
      "Piso en Girona",
      "Rehabilitación de edificio en Lleida",
    ]);
  });

  it("mostra el tipus, la data, l'import, l'estat i el progrés actuals", async () => {
    renderPage();
    const card = await screen.findByRole("article", { name: "Piso en Girona" });

    expect(card).toHaveTextContent("Inmobiliaria");
    expect(card).toHaveTextContent(/Comprometida el 11 nov\.? 2026/);
    expect(within(card).getByText("Tu inversión").nextElementSibling).toHaveTextContent("100,00 €");
    expect(card).toHaveTextContent("En financiación");
    expect(card).toHaveTextContent("45.100,00 € de 72.000,00 € · 62,6 %");
  });

  it("si s'ha invertit dues vegades a la mateixa oportunitat, cada inversió apareix per separat", async () => {
    response = only(
      investment({ id: 41, amount_cents: 20_000, created_at: "2026-11-15T10:00:00Z" }),
      investment({ id: 40, amount_cents: 10_000, created_at: "2026-11-10T10:00:00Z" }),
    );
    renderPage();

    const giron = await screen.findAllByRole("article", { name: "Piso en Girona" });
    expect(giron).toHaveLength(2);
    expect(within(giron[0]).getByText("Tu inversión").nextElementSibling).toHaveTextContent("200,00 €");
    expect(within(giron[1]).getByText("Tu inversión").nextElementSibling).toHaveTextContent("100,00 €");
  });
});

describe("Mis inversiones: participació estimada", () => {
  it("una inversió d'1.000,00 € amb una valoració de 2.700.000 € i un objectiu de 300.000 € mostra 0,033 %", async () => {
    renderPage();
    const card = await screen.findByRole("article", { name: "Expansión de BioPack: envases compostables" });

    expect(card).toHaveTextContent("Empresarial");
    expect(within(card).getByText("Participación estimada").nextElementSibling).toHaveTextContent("0,033 %");
  });

  it("les inversions immobiliàries no mostren cap participació", async () => {
    renderPage();
    await screen.findByText("Piso en Girona");

    expect(screen.getAllByText("Participación estimada")).toHaveLength(1);
    expect(within(screen.getByRole("article", { name: "Piso en Girona" })).queryByText("Participación estimada")).not.toBeInTheDocument();
  });
});

describe("Mis inversiones: estat actual de l'oportunitat", () => {
  it("una oportunitat que ha assolit l'objectiu mostra «Financiación completada» i el progrés al 100 %", async () => {
    renderPage();
    const card = await screen.findByRole("article", { name: "Rehabilitación de edificio en Lleida" });

    expect(card).toHaveTextContent("Financiación completada");
    expect(within(card).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(card).toHaveTextContent("· 100,0 %");
  });

  it("si la data límit ha passat sense assolir l'objectiu, mostra «Plazo finalizado»", async () => {
    response = only(investment({ id: 50 }, { title: "Nave logística en Reus", funding_status: "expired" }));
    renderPage();

    expect(await screen.findByRole("article", { name: "Nave logística en Reus" })).toHaveTextContent("Plazo finalizado");
  });

  it("l'aportació inicial a una oportunitat pròpia pendent de revisió no té enllaç al detall", async () => {
    response = {
      summary: { total_committed_cents: 500_000, commitments_count: 1, in_funding_count: 0 },
      commitments: [
        investment(
          { id: 60, amount_cents: 500_000 },
          { id: 9, title: "Local comercial en Sabadell", funding_status: "pending_review", is_public: false },
        ),
      ],
    };
    renderPage();

    const card = await screen.findByRole("article", { name: "Local comercial en Sabadell" });
    expect(card).toHaveTextContent("Pendiente de revisión");
    expect(within(card).queryByRole("link")).not.toBeInTheDocument();
    // Compta al total, però no a «En financiación» (ho calcula el backend).
    expect(stat("Total comprometido")).toHaveTextContent("5.000,00 €");
    expect(stat("En financiación")).toHaveTextContent("0");
  });
});

describe("Mis inversiones: anar a l'oportunitat", () => {
  it("el títol obre el detall de l'oportunitat", async () => {
    const user = userEvent.setup();
    renderPage();

    const card = await screen.findByRole("article", { name: "Expansión de BioPack: envases compostables" });
    const link = within(card).getByRole("link", { name: "Expansión de BioPack: envases compostables" });
    expect(link).toHaveAttribute("href", "/opportunities/equity/44");
    await user.click(link);

    expect(screen.getByRole("heading", { name: "Detalle empresarial" })).toBeInTheDocument();
  });

  it.each([
    ["funded", "Rehabilitación de edificio en Lleida"],
    ["expired", "Nave logística en Reus"],
    ["closed", "Oficinas en Tarragona"],
  ] as const)("també enllaça al detall d'una oportunitat %s, que ja no surt al catàleg", async (fundingStatus, title) => {
    response = only(investment({ id: 70 }, { id: 12, title, funding_status: fundingStatus }));
    renderPage();

    const card = await screen.findByRole("article", { name: title });
    expect(within(card).getByRole("link", { name: title })).toHaveAttribute("href", "/opportunities/real-estate/12");
  });
});

describe("Mis inversiones: sense inversions", () => {
  it("mostra «Aún no has realizado ninguna inversión» i «Explorar oportunidades» porta al catàleg", async () => {
    const user = userEvent.setup();
    response = { summary: { total_committed_cents: 0, commitments_count: 0, in_funding_count: 0 }, commitments: [] };
    renderPage();

    expect(await screen.findByRole("heading", { name: "Aún no has realizado ninguna inversión" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Resumen")).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Explorar oportunidades" }));

    expect(screen.getByRole("heading", { name: "Catálogo" })).toBeInTheDocument();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/opportunities$/);
  });
});

describe("Mis inversiones: càrrega i errors", () => {
  it("indica que s'estan carregant les inversions", () => {
    get.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText("Cargando tus inversiones…")).toBeInTheDocument();
  });

  it("si la consulta falla, mostra l'error i permet tornar-ho a provar", async () => {
    const user = userEvent.setup();
    response = new ApiError("Internal Server Error", 500, null);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se han podido cargar tus inversiones.");
    response = MOCKUP;
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Piso en Girona")).toBeInTheDocument();
  });

  it("amb la sessió caducada no mostra cap error: SessionManager ja porta al login", async () => {
    response = new ApiError("Not authenticated", 401, null);
    renderPage();

    await vi.waitFor(() => expect(useInvestmentStore.getState().status).toBe("error"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
