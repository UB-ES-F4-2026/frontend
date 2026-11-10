import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import TermsOfUse from "../src/pages/legal/TermsOfUse";
import PrivacyPolicy from "../src/pages/legal/PrivacyPolicy";

function renderDocument(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/legal/condiciones-de-uso" element={<TermsOfUse />} />
        <Route path="/legal/politica-de-privacidad" element={<PrivacyPolicy />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("documents del registre", () => {
  it.each([
    ["/legal/condiciones-de-uso", "Condiciones de uso de Grupo F4", "11. Reclamaciones y normativa aplicable"],
    ["/legal/politica-de-privacidad", "Política de privacidad de Grupo F4", "11. Cambios y contacto"],
  ])("%s mostra el contingut i identifica que és un borrador", (path, title, lastSection) => {
    renderDocument(path);
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText("Borrador para revisión · Versión de 27 de octubre de 2026")).toBeInTheDocument();
    expect(screen.getByText(/Los campos entre corchetes deben completarse/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: lastSection })).toBeInTheDocument();
    expect(screen.queryByText(/documento en preparación/)).not.toBeInTheDocument();
  });

  it("permet consultar la política des de l’enllaç del text de condicions", async () => {
    renderDocument("/legal/condiciones-de-uso");
    await userEvent.setup().click(screen.getByRole("link", { name: "política de privacidad" }));
    expect(screen.getByRole("heading", { level: 1, name: "Política de privacidad de Grupo F4" })).toBeInTheDocument();
    expect(screen.getAllByRole("table")).toHaveLength(2);
  });
});
