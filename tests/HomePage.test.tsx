import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import HomePage from "../src/pages/home/HomePage";

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

  it("no duplica la navegació de la capçalera", () => {
    renderHome();

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});