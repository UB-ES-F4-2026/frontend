import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Opportunities from "../src/pages/opportunities/Opportunities";
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
