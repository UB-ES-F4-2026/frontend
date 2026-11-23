import { describe, expect, it } from "vitest";
import {
  businessFundingSummary,
  businessSummary,
  EMPTY_BUSINESS,
  equityOffered,
  formatEquityOffered,
  toBusinessPayload,
  validateBusiness,
  type BusinessDraft,
} from "../src/pages/my-opportunities/create/business/businessDraft";

// Intl separa la xifra del «%» i del «€» amb un espai no separable (U+00A0).
const nbsp = (text: string) => text.replace(/ (%|€)/g, "\u00a0$1");

const brewery: BusinessDraft = { sector: "food_and_beverage", phase: "growth", valuation: "1.350.000,00" };

describe("validateBusiness", () => {
  it("exigeix sector, fase i valoració prèvia", () => {
    expect(validateBusiness(EMPTY_BUSINESS)).toEqual({
      sector: "Selecciona el sector.",
      phase: "Selecciona la fase de la empresa.",
      valuation: "Introduce la valoración previa a la inversión.",
    });
  });

  it("accepta les dades completes", () => {
    expect(validateBusiness(brewery)).toEqual({});
  });

  it.each([
    ["0", "La valoración previa debe ser mayor que 0."],
    ["0,00", "La valoración previa debe ser mayor que 0."],
    ["1.000,555", "El importe no puede tener más de dos decimales."],
    ["abc", "Introduce un importe válido, por ejemplo 100,00."],
  ])("rebutja la valoració «%s»", (valuation, message) => {
    expect(validateBusiness({ ...brewery, valuation })).toEqual({ valuation: message });
  });
});

describe("participació oferta", () => {
  it("és objectiu ÷ (valoració prèvia + objectiu)", () => {
    expect(equityOffered(135_000_000, 15_000_000)).toBeCloseTo(0.1);
  });

  it("mostra 10,0 % per a una valoració d'1.350.000 € i un objectiu de 150.000 €", () => {
    expect(formatEquityOffered(brewery, 15_000_000)).toBe(nbsp("10,0 %"));
  });

  it.each([
    [45_000_000, "25,0 %"],
    [67_500_000, "33,3 %"],
    [1, "0,0 %"],
  ])("canvia amb l'objectiu (%i cèntims → %s)", (target, label) => {
    expect(formatEquityOffered(brewery, target)).toBe(nbsp(label));
  });

  it("mostra «—» mentre falti l'objectiu o la valoració", () => {
    expect(formatEquityOffered(brewery, null)).toBe("—");
    expect(formatEquityOffered({ ...brewery, valuation: "" }, 15_000_000)).toBe("—");
  });

  it("és la fila de la secció «Financiación»", () => {
    expect(businessFundingSummary(brewery, 15_000_000)).toEqual([["Participación ofrecida", nbsp("10,0 %")]]);
  });
});

describe("resum i enviament", () => {
  it("resumeix sector, fase i valoració", () => {
    expect(businessSummary(brewery)).toEqual([
      ["Sector · Fase", "Alimentación y bebidas · Crecimiento"],
      ["Valoración previa a la inversión", nbsp("1.350.000,00 €")],
    ]);
  });

  it("envia la valoració en cèntims i no la participació, que calcula el backend", () => {
    expect(toBusinessPayload({ ...brewery, valuation: "1350000" })).toEqual({
      business: { sector: "food_and_beverage", phase: "growth", pre_investment_valuation_cents: 135_000_000 },
    });
  });
});
