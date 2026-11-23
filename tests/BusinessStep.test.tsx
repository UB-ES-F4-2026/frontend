import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import BusinessStep from "../src/pages/my-opportunities/create/business/BusinessStep";
import { EMPTY_BUSINESS, type BusinessDraft } from "../src/pages/my-opportunities/create/business/businessDraft";

// El pas guarda les dades al formulari pare; aquí n'hi fa les veus un estat local. `current`
// recull l'últim valor que el pas ha enviat al pare.
let current: BusinessDraft = EMPTY_BUSINESS;
function Harness() {
  const [value, setValue] = useState(EMPTY_BUSINESS);
  const handleChange = (next: BusinessDraft) => {
    current = next;
    setValue(next);
  };
  return <BusinessStep value={value} onChange={handleChange} errors={{}} />;
}

const user = () => userEvent.setup({ delay: null });

const optionsOf = async (u: ReturnType<typeof user>, field: RegExp) => {
  await u.click(screen.getByRole("button", { name: field }));
  const options = screen.getAllByRole("option").map((option) => option.textContent);
  await u.keyboard("{Escape}");
  return options;
};

describe("pas «Empresa»", () => {
  it("ofereix els sectors i les fases de la US", async () => {
    const u = user();
    render(<Harness />);

    expect(await optionsOf(u, /Sector/)).toEqual([
      "Tecnología", "Industria", "Alimentación y bebidas", "Comercio",
      "Salud", "Energía", "Turismo y ocio", "Otros servicios",
    ]);
    expect(await optionsOf(u, /Fase de la empresa/)).toEqual(["Idea", "Lanzamiento", "Crecimiento", "Consolidada"]);
  });

  it("desa el sector, la fase i la valoració amb el format d'import", async () => {
    const u = user();
    render(<Harness />);

    await u.click(screen.getByRole("button", { name: /Sector/ }));
    await u.click(screen.getByRole("option", { name: "Alimentación y bebidas" }));
    await u.click(screen.getByRole("button", { name: /Fase de la empresa/ }));
    await u.click(screen.getByRole("option", { name: "Crecimiento" }));
    const valuation = screen.getByLabelText(/Valoración previa a la inversión/);
    await u.type(valuation, "1350000");
    await u.tab();

    expect(valuation).toHaveValue("1.350.000,00");
    expect(valuation).toHaveAccessibleDescription("Valor de la empresa antes de esta ronda de financiación.");
    expect(current).toEqual({ sector: "food_and_beverage", phase: "growth", valuation: "1.350.000,00" });
  });
});
