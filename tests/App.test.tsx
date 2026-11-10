import { act, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/app/App";
import { useAuthStore } from "../src/store/useAuthStore";

beforeEach(() => useAuthStore.setState(useAuthStore.getInitialState(), true));

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
vi.mock("../src/pages/wallet/MyWalletPage", () => ({
  default: () => <h1>Pàgina simulada: saldo</h1>,
}));

vi.mock("../src/pages/legal/TermsOfUse", () => ({
  default: () => <h1>Pàgina simulada: condicions</h1>,
}));
vi.mock("../src/pages/legal/PrivacyPolicy", () => ({
  default: () => <h1>Pàgina simulada: privacitat</h1>,
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
    ["/legal/condiciones-de-uso", "Pàgina simulada: condicions"],
    ["/legal/politica-de-privacidad", "Pàgina simulada: privacitat"],
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

describe("rutes de visitant amb sessió activa", () => {
  const account = { id: 1, email: "user@example.com", created_at: "2026-10-27T10:00:00Z" };

  it.each(["/login", "/register"])("redirigeix %s a l’inici si ja hi ha sessió", async (path) => {
    useAuthStore.setState({ active_account: account });
    renderApp(path);
    expect(await screen.findByRole("heading", { name: "Pàgina simulada: inici" })).toBeInTheDocument();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/$/);
  });

  it.each(["/login", "/register"])("redirigeix %s quan es recupera la sessió després de carregar", async (path) => {
    renderApp(path);
    act(() => useAuthStore.setState({ active_account: account }));
    expect(await screen.findByRole("heading", { name: "Pàgina simulada: inici" })).toBeInTheDocument();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/$/);
  });
});

describe("ruta privada /my-balance", () => {
  const account = { id: 1, email: "user@example.com", created_at: "2026-10-27T10:00:00Z" };

  it("mostra «Mi saldo» al client autenticat", () => {
    useAuthStore.setState({ active_account: account, sessionChecked: true });
    renderApp("/my-balance");
    expect(within(screen.getByRole("main")).getByRole("heading", { name: "Pàgina simulada: saldo" })).toBeInTheDocument();
  });

  it("porta el visitant al login sense mostrar la pàgina", async () => {
    useAuthStore.setState({ sessionChecked: true });
    renderApp("/my-balance");
    expect(await screen.findByRole("heading", { name: "Pàgina simulada: login" })).toBeInTheDocument();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/login$/);
  });

  it("en recarregar espera la sessió recuperada en lloc d’expulsar l’usuari", async () => {
    renderApp("/my-balance");
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/my-balance$/);
    expect(screen.queryByRole("heading", { name: "Pàgina simulada: saldo" })).not.toBeInTheDocument();
    act(() => useAuthStore.setState({ active_account: account, sessionChecked: true }));
    expect(await screen.findByRole("heading", { name: "Pàgina simulada: saldo" })).toBeInTheDocument();
  });
});
