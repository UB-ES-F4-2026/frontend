import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import App from "../src/app/App";

// Aïllem App de la capçalera i de les pàgines: aquí només es prova l’enrutat.
vi.mock("../src/components/Header", () => ({
  default: () => <header>Capçalera simulada</header>,
}));
vi.mock("../src/pages/home/HomePage", () => ({
  default: () => <h1>Pàgina simulada: inici</h1>,
}));
vi.mock("../src/pages/auth/Register", () => ({
  default: () => <h1>Pàgina simulada: registre</h1>,
}));
vi.mock("../src/pages/auth/Login", () => ({
  default: () => <h1>Pàgina simulada: login</h1>,
}));
vi.mock("../src/pages/test/AppTest", () => ({
  default: () => <h1>Pàgina simulada: connexió</h1>,
}));
vi.mock("../src/pages/opportunities/Opportunities", () => ({
  default: () => <h1>Pàgina simulada: oportunitats</h1>,
}));

function CurrentPath() {
  return <output aria-label="Ruta actual">{useLocation().pathname}</output>;
}

function renderApp(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <CurrentPath />
    </MemoryRouter>,
  );
}

describe("enrutat d'App", () => {
  it.each([
    ["/", "Pàgina simulada: inici"],
    ["/register", "Pàgina simulada: registre"],
    ["/login", "Pàgina simulada: login"],
    ["/opportunities", "Pàgina simulada: oportunitats"],
    ["/test", "Pàgina simulada: connexió"],
  ])("mostra la pàgina corresponent a %s dins de main", (path, heading) => {
    renderApp(path);

    expect(within(screen.getByRole("main")).getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(new RegExp(`^${path}$`));
  });

  it("mostra la capçalera fora de main, sigui quina sigui la ruta", () => {
    renderApp("/login");

    expect(screen.getByText("Capçalera simulada")).toBeInTheDocument();
    expect(within(screen.getByRole("main")).queryByText("Capçalera simulada")).not.toBeInTheDocument();
  });

  it.each(["/ruta-inexistent", "/oportunidades"])("redirigeix %s a l’inici", async (path) => {
    renderApp(path);

    expect(await screen.findByRole("heading", { name: "Pàgina simulada: inici" })).toBeInTheDocument();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/$/);
  });
});