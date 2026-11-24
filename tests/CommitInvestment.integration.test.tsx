import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BusinessDetail from "../src/pages/opportunities/business/BusinessDetail";
import { useAuthStore } from "../src/store/useAuthStore";
import { useOpportunityStore } from "../src/store/useOpportunityStore";
import { useWalletStore } from "../src/store/useWalletStore";

const fetchMock = vi.fn();
const detail = {
  id: 44,
  type: "equity",
  status: "published",
  title: "Expansión de BioPack",
  description: "BioPack busca financiación para ampliar su línea de envases compostables.",
  location: "Sabadell, Barcelona, España",
  cover_image_url: null,
  target_amount_cents: 300_000_00,
  committed_cents: 184_500_00,
  minimum_contribution_cents: 250_00,
  date_published: "2026-11-02T09:00:00.000Z",
  deadline: "2099-12-15T22:59:00.000Z",
  server_time: "2026-11-23T12:00:00.000Z",
  promoter: {
    user_id: 10,
    legal_name: "BioPack Solutions SL",
    image_url: null,
    published_projects_count: 2,
    experience_years: 6,
    location: "Sabadell, Barcelona, España",
  },
  business: {
    sector: "energy",
    phase: "growth",
    pre_investment_valuation_cents: 2_700_000_00,
    equity_offered: "10",
  },
};

const wallet = { available_cents: 1_500_00, committed_cents: 0, currency: "eur" };
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  useOpportunityStore.setState(useOpportunityStore.getInitialState(), true);
  useWalletStore.getState().reset();
  useAuthStore.setState({
    active_account: { id: 1, email: "user@example.com", created_at: "2026-10-27T10:00:00Z" },
    sessionChecked: true,
  });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

const page = () => render(
  <MemoryRouter initialEntries={["/opportunities/equity/44"]}>
    <Routes>
      <Route path="/opportunities/equity/:id" element={<BusinessDetail />} />
    </Routes>
  </MemoryRouter>,
);

const openConfirmation = async () => {
  const user = userEvent.setup({ delay: null });
  await user.click(await screen.findByRole("button", { name: "Quiero invertir" }));
  const dialog = await screen.findByRole("dialog", { name: "Comprometer inversión" });
  await within(dialog).findByText("1.500,00 €");
  await user.type(within(dialog).getByRole("textbox", { name: /Importe de la inversión/ }), "1000");
  await user.click(within(dialog).getByRole("button", { name: "Continuar" }));
  return { user, dialog: await screen.findByRole("dialog", { name: "Confirma tu inversión" }) };
};

describe("Inversión empresarial: integración de detalle, store y API", () => {
  it("envía el compromiso al endpoint real y actualiza el resultado visible", async () => {
    fetchMock.mockImplementation((url: string, options?: RequestInit) => {
      if (url === "/api/opportunities/44") return Promise.resolve(jsonResponse(detail));
      if (url === "/api/me/wallet") return Promise.resolve(jsonResponse(wallet));
      if (url === "/api/opportunities/44/commitments") {
        expect(options?.method).toBe("POST");
        expect(options?.credentials).toBe("include");
        expect(JSON.parse(options?.body as string)).toEqual({ amount_cents: 100_000 });
        return Promise.resolve(jsonResponse({
          commitment: { id: 1, opportunity_id: 44, amount_cents: 100_000, created_at: "2026-11-23T12:00:00Z", estimated_equity: "0.03333333333333333333333333333" },
          opportunity: { id: 44, target_amount_cents: 300_000_00, committed_cents: 185_500_00 },
          wallet: { available_cents: 500_00, committed_cents: 100_000, currency: "eur" },
        }));
      }
      throw new Error(`Petición inesperada: ${url}`);
    });

    page();
    const { user, dialog } = await openConfirmation();
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(within(dialog).getByRole("button", { name: "Confirmar inversión" }));

    expect(await screen.findByRole("dialog", { name: "Inversión comprometida" })).toHaveTextContent("1.000,00 €");
    // 1.500,00 € disponibles menys els 1.000,00 € compromesos: el saldo que retorna el backend.
    expect(screen.getByRole("dialog", { name: "Inversión comprometida" })).toHaveTextContent("Tu saldo disponible ahora es de 500,00 €.");
    expect(fetchMock).toHaveBeenCalledWith("/api/opportunities/44/commitments", expect.objectContaining({ method: "POST" }));
  });

  it("mantiene la confirmación tras un error recuperable y permite reintentar", async () => {
    let fails = true;
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/opportunities/44") return Promise.resolve(jsonResponse(detail));
      if (url === "/api/me/wallet") return Promise.resolve(jsonResponse(wallet));
      if (url === "/api/opportunities/44/commitments") {
        return Promise.resolve(fails
          ? jsonResponse({ detail: "Temporary failure" }, 503)
          : jsonResponse({
              commitment: { id: 1, opportunity_id: 44, amount_cents: 100_000, created_at: "2026-11-23T12:00:00Z", estimated_equity: "0.03333333333333333333333333333" },
              opportunity: { id: 44, target_amount_cents: 300_000_00, committed_cents: 185_500_00 },
              wallet: { available_cents: 500_00, committed_cents: 100_000, currency: "eur" },
            }));
      }
      throw new Error(`Petición inesperada: ${url}`);
    });

    page();
    const { user, dialog } = await openConfirmation();
    await user.click(within(dialog).getByRole("checkbox"));
    const confirm = within(dialog).getByRole("button", { name: "Confirmar inversión" });
    await user.click(confirm);
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("No se ha podido comprometer la inversión.");

    fails = false;
    await user.click(confirm);
    expect(await screen.findByRole("dialog", { name: "Inversión comprometida" })).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/opportunities/44/commitments")).toHaveLength(2);
  });
});
