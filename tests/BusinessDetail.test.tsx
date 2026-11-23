import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BusinessDetail from "../src/pages/opportunities/business/BusinessDetail";
import type { BusinessOpportunityGetResponse } from "../src/store/useOpportunityStore";

// Estat simulat de useOpportunityStore: només els camps que fa servir el detall empresarial.
const opportunityState = vi.hoisted(() => ({
  detailStatus: "idle" as "idle" | "loading" | "success" | "error",
  detailId: null as number | null,
  detailDetails: "",
  businessOpportunity: null as BusinessOpportunityGetResponse | null,
  fetchBusinessOpportunity: vi.fn(),
  refreshBusinessOpportunity: vi.fn(),
}));

// El diàleg d'inversió es prova a CommitInvestment.test.tsx; aquí només si s'obre i amb quines dades.
vi.mock("../src/pages/opportunities/dialogs/CommitContributionModal", () => ({
  default: ({ opportunity, onClose, onRefresh }: {
    opportunity: { id: number; type: string };
    onClose: () => void;
    onRefresh: () => void;
  }) => (
    <div role="dialog" aria-label="Diàleg simulat">
      Oportunitat {opportunity.id} ({opportunity.type})
      <button onClick={onRefresh}>Actualitzar</button>
      <button onClick={onClose}>Tancar</button>
    </div>
  ),
}));

const authState = vi.hoisted(() => ({
  status: "idle" as "idle" | "loading" | "success" | "error",
  active_account: null as { id: number; email: string; created_at: string } | null,
}));

// Rellotge controlat per provar terminis en curs/vençuts i dates passades/futures.
const nowRef = vi.hoisted(() => ({
  value: new Date("2026-11-22T12:00:00.000Z").getTime(),
}));

vi.mock("../src/store/useOpportunityStore", () => ({
  useOpportunityStore: (selector?: (value: typeof opportunityState) => unknown) =>
    selector ? selector(opportunityState) : opportunityState,
}));

vi.mock("../src/store/useAuthStore", () => ({
  useAuthStore: (selector?: (value: typeof authState) => unknown) =>
    selector ? selector(authState) : authState,
}));

vi.mock("../src/hooks/useNow", () => ({
  useNow: () => nowRef.value,
}));

function buildBusinessOpportunity(
  overrides: Partial<BusinessOpportunityGetResponse> = {},
): BusinessOpportunityGetResponse {
  return {
    id: 44,
    type: "equity",
    status: "published",
    title: "Expansión de BioPack",
    description:
      "BioPack busca financiación para ampliar su línea de envases compostables.\n\nLa empresa ya suministra a más de 40 restaurantes de Cataluña.",
    location: "Sabadell, Barcelona, España",
    cover_image_url: "https://example.com/biopack-cover.jpg",
    target_amount_cents: 300_000_00,
    committed_cents: 184_500_00,
    minimum_contribution_cents: 250_00,
    date_published: "2026-11-02T09:00:00.000Z",
    deadline: "2026-12-15T22:59:00.000Z",
    server_time: "2026-11-22T12:00:00.000Z",
    promoter: {
      user_id: 10,
      legal_name: "BioPack Solutions SL",
      image_url: "https://example.com/biopack-logo.jpg",
      published_projects_count: 2,
      experience_years: 6,
      location: "Sabadell, Barcelona, España",
    },
    business: {
      sector: "energy",
      phase: "growth",
      pre_investment_valuation_cents: 2_700_000_00,
      // El backend envia el Decimal com a text.
      equity_offered: "10.00000000000000000000000000",
    },
    ...overrides,
  };
}

function CurrentPath() {
  return <output aria-label="Ruta actual">{useLocation().pathname}</output>;
}

function renderBusinessDetail(initialEntry = "/opportunities/equity/44") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/opportunities/equity/:id" element={<BusinessDetail />} />
        <Route path="/opportunities" element={<h1>Página simulada: listado de oportunidades</h1>} />
        <Route path="/login" element={<h1>Página simulada: login</h1>} />
      </Routes>
      <CurrentPath />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  nowRef.value = new Date("2026-11-22T12:00:00.000Z").getTime();

  opportunityState.detailStatus = "success";
  opportunityState.detailId = 44;
  opportunityState.detailDetails = "";
  opportunityState.businessOpportunity = buildBusinessOpportunity();

  // Per defecte, la sessió ja s'ha comprovat i l'usuari no l'ha iniciada: el detall és públic.
  authState.status = "success";
  authState.active_account = null;
});

describe("BusinessDetail - Accés públic i estats de càrrega", () => {
  it("demana el detall en muntar-se i mostra l'esquelet mentre es carrega", () => {
    opportunityState.detailStatus = "loading";
    renderBusinessDetail();

    expect(opportunityState.fetchBusinessOpportunity).toHaveBeenCalledExactlyOnceWith(44);
    expect(screen.getByText("Cargando la oportunidad…")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("es pot consultar sense sessió i no redirigeix a l'inici de sessió", () => {
    renderBusinessDetail();

    expect(screen.getByRole("heading", { level: 1, name: "Expansión de BioPack" })).toBeInTheDocument();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/opportunities\/equity\/44$/);
  });

  it("mostra l'error de càrrega i permet reintentar", async () => {
    const user = userEvent.setup();
    opportunityState.detailStatus = "error";
    opportunityState.detailDetails = "Oportunidad no disponible (HTTP 404)";
    renderBusinessDetail();

    expect(screen.getByRole("heading", { name: "No se ha podido cargar la oportunidad" })).toBeInTheDocument();
    expect(screen.getByText("Oportunidad no disponible (HTTP 404)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(opportunityState.fetchBusinessOpportunity).toHaveBeenCalledTimes(2);
  });

  it("mostra «Oportunidad no encontrada» si la resposta és nul·la o és una oportunitat immobiliària", () => {
    opportunityState.businessOpportunity = buildBusinessOpportunity({ type: "real_estate" });
    const { unmount } = renderBusinessDetail();
    expect(screen.getByRole("heading", { name: "Oportunidad no encontrada" })).toBeInTheDocument();
    unmount();

    opportunityState.businessOpportunity = null;
    renderBusinessDetail();
    expect(screen.getByRole("heading", { name: "Oportunidad no encontrada" })).toBeInTheDocument();
  });

  it("no demana res amb un identificador no vàlid i ofereix tornar al catàleg", async () => {
    const user = userEvent.setup();
    renderBusinessDetail("/opportunities/equity/abc");

    expect(opportunityState.fetchBusinessOpportunity).not.toHaveBeenCalled();
    expect(
      screen.getByText("La dirección no corresponde a ninguna oportunidad empresarial."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /Volver a oportunidades/ }));
    expect(
      await screen.findByRole("heading", { name: "Página simulada: listado de oportunidades" }),
    ).toBeInTheDocument();
  });
});

describe("BusinessDetail - Contingut del detall empresarial", () => {
  it("mostra la capçalera, la galeria, l'entitat promotora i el resum del finançament", () => {
    renderBusinessDetail();

    expect(screen.getByText("BioPack busca financiación para ampliar su línea de envases compostables.")).toBeInTheDocument();
    expect(screen.getAllByText("Sabadell, Barcelona, España").length).toBeGreaterThan(0);

    // Sense galeria pròpia: portada i imatge del promotor.
    expect(screen.getByRole("img", { name: "Imagen de Expansión de BioPack" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mostrar imagen 1 de 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mostrar imagen 2 de 2" })).toBeInTheDocument();

    const promoter = screen.getByRole("region", { name: "Entidad promotora" });
    expect(within(promoter).getByText("BioPack Solutions SL")).toBeInTheDocument();
    expect(within(promoter).getByText("Dato declarado por la entidad")).toBeInTheDocument();

    expect(screen.getByText("En financiación")).toBeInTheDocument();
    expect(screen.getByText("Capital comprometido")).toBeInTheDocument();
    expect(screen.getByText("184.500,00 €")).toBeInTheDocument();
    expect(screen.getByText("300.000,00 €")).toBeInTheDocument();
    expect(screen.getByText("61,5 % del objetivo")).toBeInTheDocument();
    expect(screen.getByText("Fecha límite de financiación")).toBeInTheDocument();
    expect(screen.getByText(/Hora de Madrid \(UTC\+0?1(:00)?\)/)).toBeInTheDocument();
    expect(screen.getByText("Aportación mínima")).toBeInTheDocument();
    expect(screen.getByText("250,00 €")).toBeInTheDocument();
  });

  it("mostra el sector, la fase i les condicions de la inversió, sense característiques de l'immoble", () => {
    renderBusinessDetail();

    const summary = screen.getByRole("region", { name: "Resumen del proyecto" });
    expect(within(summary).getByText("La empresa ya suministra a más de 40 restaurantes de Cataluña.")).toBeInTheDocument();
    expect(within(summary).getByText("Sector")).toBeInTheDocument();
    expect(within(summary).getByText("Energía")).toBeInTheDocument();
    expect(within(summary).getByText("Fase de la empresa")).toBeInTheDocument();
    expect(within(summary).getByText("Crecimiento")).toBeInTheDocument();

    const terms = screen.getByRole("region", { name: "Condiciones de la inversión" });
    expect(within(terms).getByText("Valoración previa a la inversión")).toBeInTheDocument();
    expect(within(terms).getByText("2.700.000,00 €")).toBeInTheDocument();
    expect(within(terms).getByText("Participación ofrecida")).toBeInTheDocument();
    expect(within(terms).getByText(/^10,0\s%/)).toBeInTheDocument();

    expect(screen.queryByText("Características del inmueble")).not.toBeInTheDocument();
  });

  it("mostra només la publicació i el final del finançament, sense ubicació aproximada ni mapa", () => {
    renderBusinessDetail();

    const dates = screen.getByRole("region", { name: "Fechas del proyecto" });
    const items = within(dates).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Publicación");
    expect(items[0]).toHaveTextContent("Fecha pasada");
    expect(items[1]).toHaveTextContent("Fin de financiación");
    expect(items[1]).toHaveTextContent("Fecha futura");

    expect(screen.queryByText("Ubicación aproximada")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Mapa de la ubicación aproximada")).not.toBeInTheDocument();
    expect(screen.queryByText("Mapa no disponible")).not.toBeInTheDocument();
  });

  it("mostra «—» si la participació oferta no arriba en un format numèric", () => {
    opportunityState.businessOpportunity = buildBusinessOpportunity({
      business: { ...buildBusinessOpportunity().business, equity_offered: "no-numèric" },
    });
    renderBusinessDetail();

    const terms = screen.getByRole("region", { name: "Condiciones de la inversión" });
    expect(within(terms).getByText(/^—/)).toBeInTheDocument();
  });
});

describe("BusinessDetail - Botó «Quiero invertir»", () => {
  it("està actiu mentre l'oportunitat està en finançament", () => {
    renderBusinessDetail();
    expect(screen.getByRole("button", { name: "Quiero invertir" })).toBeEnabled();
  });

  it("està desactivat quan s'ha assolit l'objectiu de finançament", () => {
    opportunityState.businessOpportunity = buildBusinessOpportunity({ committed_cents: 300_000_00 });
    renderBusinessDetail();

    expect(screen.getByText("Financiación completada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quiero invertir" })).toBeDisabled();
  });

  it("està desactivat quan ha passat la data límit", () => {
    nowRef.value = new Date("2027-01-01T00:00:00.000Z").getTime();
    renderBusinessDetail();

    expect(screen.getByText("Plazo finalizado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quiero invertir" })).toBeDisabled();
  });

  it("sense sessió, porta a l'inici de sessió en prémer-lo", async () => {
    const user = userEvent.setup();
    renderBusinessDetail();

    await user.click(screen.getByRole("button", { name: "Quiero invertir" }));

    expect(await screen.findByRole("heading", { name: "Página simulada: login" })).toBeInTheDocument();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/login$/);
  });

  it("amb sessió, obre el diàleg d'inversió amb l'oportunitat empresarial", async () => {
    authState.active_account = { id: 1, email: "ana@example.com", created_at: "2026-10-17T10:00:00Z" };
    const user = userEvent.setup();
    renderBusinessDetail();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Quiero invertir" }));

    expect(screen.getByRole("dialog", { name: "Diàleg simulat" })).toHaveTextContent("Oportunitat 44 (equity)");
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/opportunities\/equity\/44$/);
  });

  it("en tancar el diàleg torna al detall, i si cal el torna a llegir sense desmuntar-lo", async () => {
    authState.active_account = { id: 1, email: "ana@example.com", created_at: "2026-10-17T10:00:00Z" };
    const user = userEvent.setup();
    renderBusinessDetail();
    await user.click(screen.getByRole("button", { name: "Quiero invertir" }));

    await user.click(screen.getByRole("button", { name: "Actualitzar" }));
    expect(opportunityState.refreshBusinessOpportunity).toHaveBeenCalledExactlyOnceWith(44);

    await user.click(screen.getByRole("button", { name: "Tancar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Expansión de BioPack" })).toBeInTheDocument();
  });
});
