import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MyInvestmentsPage from "../src/pages/investments/MyInvestmentsPage";
import { useInvestmentStore } from "../src/store/useInvestmentStore";

const fetchMock = vi.fn();
const investments = {
  summary: { total_committed_cents: 100_000, commitments_count: 1, in_funding_count: 1 },
  commitments: [{
    id: 11,
    amount_cents: 100_000,
    created_at: "2026-11-23T10:00:00Z",
    estimated_equity: null,
    opportunity: {
      id: 7,
      title: "Piso en Girona",
      type: "real_estate",
      funding_status: "in_funding",
      target_amount_cents: 7_200_000,
      committed_cents: 4_510_000,
      deadline: "2027-12-15T22:59:00Z",
      is_public: true,
    },
  }],
};

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

beforeEach(() => {
  useInvestmentStore.setState(useInvestmentStore.getInitialState(), true);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

const page = () => render(<MemoryRouter><MyInvestmentsPage /></MemoryRouter>);

describe("Mis inversiones: integración de página, store y API", () => {
  it("consulta los compromisos mediante el cliente HTTP real y muestra su resumen", async () => {
    fetchMock.mockResolvedValue(jsonResponse(investments));

    page();

    expect(await screen.findByText("Piso en Girona")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/me/commitments", expect.objectContaining({
      method: "GET",
      credentials: "include",
    }));
    expect(screen.getByText("1.000,00 €")).toBeInTheDocument();
  });

  it("muestra un error recuperable y vuelve a consultar los compromisos al reintentar", async () => {
    let fails = true;
    fetchMock.mockImplementation(() => Promise.resolve(fails
      ? jsonResponse({ detail: "Service unavailable" }, 503)
      : jsonResponse(investments)));
    const user = userEvent.setup({ delay: null });

    page();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se han podido cargar tus inversiones.");
    fails = false;
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Piso en Girona")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
