import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import HomePage from "../src/pages/home/HomePage";
import { useAuthStore } from "../src/store/useAuthStore";

const account = { id: 1, email: "user@example.com", created_at: "2026-10-27T10:00:00Z" };

// Cada test comença com a visitant.
beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
});

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe("HomePage", () => {
  it("mostra el títol principal com a únic h1", () => {
    renderHome();

    expect(screen.getByRole("heading", { level: 1, name: /Encuentra tu próxima oportunidad de inversión/ })).toBeInTheDocument();
  });

  it("explica la proposta de valor", () => {
    renderHome();

    expect(screen.getByText(/financiación colectiva/)).toBeInTheDocument();
  });

  it.each([
    ["Ver oportunidades", "/opportunities"],
    ["Crear cuenta", "/register"],
  ])("ofereix la crida a l’acció «%s» cap a %s", (name, href) => {
    renderHome();

    expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
  });

  it("amb sessió iniciada no ofereix «Crear cuenta» però manté «Ver oportunidades»", () => {
    useAuthStore.setState({ active_account: account });
    renderHome();

    expect(screen.queryByRole("link", { name: "Crear cuenta" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver oportunidades" })).toHaveAttribute("href", "/opportunities");
  });

  it("amaga «Crear cuenta» en iniciar sessió i el torna a mostrar en tancar-la", () => {
    renderHome();
    expect(screen.getByRole("link", { name: "Crear cuenta" })).toBeInTheDocument();

    act(() => useAuthStore.setState({ active_account: account }));
    expect(screen.queryByRole("link", { name: "Crear cuenta" })).not.toBeInTheDocument();

    act(() => useAuthStore.getState().clearSession());
    expect(screen.getByRole("link", { name: "Crear cuenta" })).toHaveAttribute("href", "/register");
  });

  it("no duplica la navegació de la capçalera", () => {
    renderHome();

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});