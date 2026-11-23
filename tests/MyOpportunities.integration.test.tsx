import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MyOpportunitiesPage from "../src/pages/my-opportunities/MyOpportunitiesPage";
import { useAuthStore } from "../src/store/useAuthStore";
import { useOpportunityStore } from "../src/store/useOpportunityStore";

const fetchMock = vi.fn();
const promoter = { id: 2, email: "promotora@example.com", created_at: "2026-11-23T10:00:00Z", is_promoter: true };
const opportunities = {
  summary: { committed_cents: 4_510_000, published_count: 1, in_funding_count: 1, pending_review_count: 0 },
  opportunities: [{
    id: 7,
    title: "Piso en Girona",
    type: "real_estate",
    funding_status: "in_funding",
    target_amount_cents: 7_200_000,
    committed_cents: 4_510_000,
    investors_count: 14,
    deadline: "2027-12-15T22:59:00Z",
    date_published: "2026-11-02T09:00:00Z",
    created_at: "2026-11-02T09:00:00Z",
    is_public: true,
  }],
};

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  useOpportunityStore.setState(useOpportunityStore.getInitialState(), true);
  useAuthStore.setState({ active_account: promoter, sessionChecked: true });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

const page = () => render(<MemoryRouter><MyOpportunitiesPage /></MemoryRouter>);

describe("Mis oportunidades: integración de página, store y API", () => {
  it("consulta las oportunidades del promotor mediante el cliente HTTP real", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/me/opportunities") return Promise.resolve(jsonResponse(opportunities));
      if (url === "/api/promotingentity") return Promise.resolve(jsonResponse([{ user_id: 2, legal_name: "Promociones Ejemplo SL" }]));
      throw new Error(`Petición inesperada: ${url}`);
    });

    page();

    expect(await screen.findByText("Piso en Girona")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/me/opportunities", expect.objectContaining({
      method: "GET",
      credentials: "include",
    }));
    expect(fetchMock).toHaveBeenCalledWith("/api/promotingentity", expect.objectContaining({
      method: "GET",
      credentials: "include",
    }));
  });

  it("muestra un error recuperable y vuelve a cargar la lista al reintentar", async () => {
    let fails = true;
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/promotingentity") return Promise.resolve(jsonResponse([{ user_id: 2, legal_name: "Promociones Ejemplo SL" }]));
      if (url === "/api/me/opportunities") {
        return Promise.resolve(fails
          ? jsonResponse({ detail: "Service unavailable" }, 503)
          : jsonResponse(opportunities));
      }
      throw new Error(`Petición inesperada: ${url}`);
    });
    const user = userEvent.setup({ delay: null });

    page();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se han podido cargar tus oportunidades.");
    fails = false;
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Piso en Girona")).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/me/opportunities")).toHaveLength(2);
  });
});
