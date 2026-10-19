import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Opportunities from "../src/pages/opportunities/Opportunities";

// Aislamos el componente del store simulando su estado
const state = vi.hoisted(() => ({
  status: "idle",
  details: "",
  opportunities: [] as any[],
  fetchOpportunities: vi.fn(),
}));

vi.mock("../src/store/useOpportunityStore", () => ({
  useOpportunityStore: (selector?: (value: typeof state) => unknown) => 
    selector ? selector(state) : state,
}));

function renderOpportunities() {
  // Envolvemos en MemoryRouter porque OpportunityCard podría usar enlaces internamente en el futuro,
  // y para mantener la consistencia con el resto de tests.
  return render(
    <MemoryRouter>
      <Opportunities />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  state.status = "idle";
  state.details = "";
  state.opportunities = [];
});

describe("Opportunities", () => {
  it("llama a fetchOpportunities al montarse el componente", () => {
    renderOpportunities();
    expect(state.fetchOpportunities).toHaveBeenCalledOnce();
  });

  it("muestra el mensaje de carga cuando el estado es 'loading'", () => {
    state.status = "loading";
    renderOpportunities();
    
    expect(screen.getByTestId("opportunities-skeleton")).toBeInTheDocument();
    expect(screen.queryByText("Reintentar")).not.toBeInTheDocument();
  });

  it("muestra el mensaje de error y permite reintentar la petición", async () => {
    state.status = "error";
    state.details = "Error de conexión con el servidor.";
    renderOpportunities();
    
    // Verificamos que muestra el texto del error
    expect(screen.getByText("Error de conexión con el servidor.")).toBeInTheDocument();
    
    // Verificamos el botón y su funcionalidad
    const retryButton = screen.getByRole("button", { name: "Reintentar" });
    expect(retryButton).toBeInTheDocument();
    
    const user = userEvent.setup();
    await user.click(retryButton);
    
    // fetchOpportunities debe haberse llamado al montar (1) y al hacer clic (2)
    expect(state.fetchOpportunities).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("opportunities-skeleton")).not.toBeInTheDocument();
  });

  it("muestra un mensaje alternativo cuando no hay oportunidades publicadas", () => {
    state.status = "success";
    state.opportunities = [];
    renderOpportunities();
    
    expect(screen.getByText("¡Aún no hay oportunidades publicadas!")).toBeInTheDocument();
    expect(screen.queryByTestId("opportunities-skeleton")).not.toBeInTheDocument();
  });

  it("renderiza la lista de tarjetas de oportunidades cuando la petición tiene éxito", () => {
    state.status = "success";
    state.opportunities = [
      {
        id: "1",
        type: "real_estate",
        title: "Edificio Histórico L'Eixample",
        location: "Barcelona",
        cover_image_url: null,
        target_amount_cents: 150000000,
        committed_cents: 50000000,
        deadline: "2026-12-15T23:59:59.000Z"
      },
      {
        id: "2",
        type: "equity",
        title: "Startup EcoLogistics SL",
        location: "Valencia",
        cover_image_url: null,
        target_amount_cents: 40000000,
        committed_cents: 40000000,
        deadline: "2026-12-10T14:00:00.000Z"
      }
    ];
    renderOpportunities();
    
    // Verificamos que los títulos de las oportunidades se están renderizando (OpportunityCard)
    expect(screen.getByText("Edificio Histórico L'Eixample")).toBeInTheDocument();
    expect(screen.getByText("Startup EcoLogistics SL")).toBeInTheDocument();
    
    // Verificamos información anidada para asegurar que el Card recibe los datos correctamente
    expect(screen.getByText("Barcelona")).toBeInTheDocument();
    expect(screen.getByText("Valencia")).toBeInTheDocument();
  });
});