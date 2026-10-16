import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import App from "../src/app/App";

// Aïllem App de les pàgines: no executem formularis, stores ni peticions.
// MemoryRouter es manté real com a suport per comprovar les rutes d’App.
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

// Permet comprovar la ruta resultant sense obrir un navegador real.
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

describe("App aïllat de les pàgines", () => {
  it("permet navegar entre inici, registre i login", async () => {
    const user = userEvent.setup();
    renderApp();
    const navigation = within(screen.getByRole("navigation", { name: "Navegación principal" }));

    expect(screen.getByRole("heading", { name: "Pàgina simulada: inici" })).toBeInTheDocument();

    await user.click(navigation.getByRole("link", { name: "Crear cuenta" }));
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/register$/);
    expect(screen.getByRole("heading", { name: "Pàgina simulada: registre" })).toBeInTheDocument();

    await user.click(navigation.getByRole("link", { name: "Iniciar sesión" }));
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/login$/);
    expect(screen.getByRole("heading", { name: "Pàgina simulada: login" })).toBeInTheDocument();

    await user.click(navigation.getByRole("link", { name: "Inicio" }));
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/$/);
    expect(screen.getByRole("heading", { name: "Pàgina simulada: inici" })).toBeInTheDocument();
  });

  it.each([
    ["/", "Inicio"],
    ["/register", "Crear cuenta"],
    ["/login", "Iniciar sesión"],
  ])("indica només l’enllaç actiu a %s", (path, label) => {
    renderApp(path);
    const navigation = within(screen.getByRole("navigation", { name: "Navegación principal" }));
    const activeLink = navigation.getByRole("link", { name: label });

    expect(activeLink).toHaveAttribute("aria-current", "page");
    for (const link of navigation.getAllByRole("link")) {
      if (link !== activeLink) expect(link).not.toHaveAttribute("aria-current");
    }
  });

  it("redirigeix una ruta desconeguda a l’inici", async () => {
    renderApp("/ruta-inexistent");

    expect(await screen.findByRole("heading", { name: "Pàgina simulada: inici" })).toBeInTheDocument();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/$/);
    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute("aria-current", "page");
  });
});
