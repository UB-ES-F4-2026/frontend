import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import Header from "../src/components/Header";

function CurrentPath() {
  return <output aria-label="Ruta actual">{useLocation().pathname}</output>;
}

function renderHeader(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Header />
      <CurrentPath />
    </MemoryRouter>,
  );
}

const navigation = () => within(screen.getByRole("navigation", { name: "Navegación principal" }));

describe("Header", () => {
  it.each([
    ["ES Grupo F4", "/"],
    ["Inicio", "/"],
    ["Oportunidades", "/opportunities"],
    ["Iniciar sesión", "/login"],
    ["Registrarse", "/register"],
  ])("el enllaç «%s» apunta a %s", (name, href) => {
    renderHeader();

    expect(navigation().getByRole("link", { name })).toHaveAttribute("href", href);
  });

  it.each([
    ["/", "Inicio"],
    ["/opportunities", "Oportunidades"],
    ["/login", "Iniciar sesión"],
    ["/register", "Registrarse"],
  ])("a %s només està actiu «%s»", (path, label) => {
    renderHeader(path);
    const active = navigation().getByRole("link", { name: label });

    expect(active).toHaveAttribute("aria-current", "page");
    for (const link of navigation().getAllByRole("link")) {
      if (link !== active) expect(link).not.toHaveAttribute("aria-current");
    }
  });

  it("el logo no s’marca mai com a actiu, ni a l’inici", () => {
    renderHeader("/");

    expect(navigation().getByRole("link", { name: "ES Grupo F4" })).not.toHaveAttribute("aria-current");
  });

  it("no marca cap enllaç actiu en una ruta que no és de la navegació", () => {
    renderHeader("/test");

    for (const link of navigation().getAllByRole("link")) {
      expect(link).not.toHaveAttribute("aria-current");
    }
  });

  it("permet navegar entre les seccions i el logo torna a l’inici", async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(navigation().getByRole("link", { name: "Registrarse" }));
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/register$/);
    expect(navigation().getByRole("link", { name: "Registrarse" })).toHaveAttribute("aria-current", "page");

    await user.click(navigation().getByRole("link", { name: "Oportunidades" }));
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/opportunities$/);

    await user.click(navigation().getByRole("link", { name: "Iniciar sesión" }));
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/login$/);

    await user.click(navigation().getByRole("link", { name: "ES Grupo F4" }));
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/$/);
    expect(navigation().getByRole("link", { name: "Inicio" })).toHaveAttribute("aria-current", "page");
  });
});