import { describe, expect, it } from "vitest";
import {
  EMPTY_REAL_ESTATE,
  realEstateSummary,
  toRealEstatePayload,
  validateRealEstate,
  type RealEstateDraft,
} from "../src/pages/my-opportunities/create/real-estate/realEstateDraft";

const commercial: RealEstateDraft = {
  ...EMPTY_REAL_ESTATE,
  purpose: "acquisition",
  intended_use: "sale",
  asset_type: "commercial",
  surface: "180",
};

describe("validateRealEstate", () => {
  it("exigeix finalitat, ús previst, tipus d'actiu i superfície", () => {
    expect(validateRealEstate(EMPTY_REAL_ESTATE)).toEqual({
      purpose: "Selecciona la finalidad.",
      intended_use: "Selecciona el uso previsto.",
      asset_type: "Selecciona el tipo de activo.",
      surface: "Introduce la superficie.",
    });
  });

  it("accepta les dades mínimes d'un actiu sense viviendas", () => {
    expect(validateRealEstate(commercial)).toEqual({});
  });

  it.each([
    ["0", "La superficie debe ser mayor que 0."],
    ["180,555", "La superficie no puede tener más de dos decimales."],
    ["abc", "Introduce una superficie válida, por ejemplo 180 o 180,5."],
    ["100.000.000", "La superficie no puede superar los 99.999.999,99 m²."],
  ])("rebutja la superfície «%s»", (surface, message) => {
    expect(validateRealEstate({ ...commercial, surface })).toEqual({ surface: message });
  });

  it.each([
    ["", "Introduce el número de viviendas previstas."],
    ["0", "El número de viviendas debe ser mayor que 0."],
    ["2,5", "Introduce un número entero de viviendas."],
    ["9999999999", "Introduce un número de viviendas válido."],
  ])("per a Residencial o Mixto rebutja les viviendas «%s»", (units, message) => {
    expect(validateRealEstate({ ...commercial, asset_type: "residential", housing_units: units })).toEqual({
      housing_units: message,
    });
    expect(validateRealEstate({ ...commercial, asset_type: "mixed", housing_units: units })).toEqual({
      housing_units: message,
    });
  });

  it("no valida les viviendas d'un tipus que no en té", () => {
    expect(validateRealEstate({ ...commercial, housing_units: "abc" })).toEqual({});
  });
});

describe("toRealEstatePayload", () => {
  it("envia la superfície com a decimal exacte i omet els camps que no corresponen", () => {
    const draft: RealEstateDraft = {
      ...commercial,
      surface: "1.250,5",
      // Valors que es van indicar abans de canviar la finalitat, l'ús o el tipus.
      housing_units: "12",
      works_end: "2027-06-30",
      rental_start: "2027-09-01",
    };
    expect(toRealEstatePayload(draft)).toEqual({
      real_estate: {
        purpose: "acquisition",
        intended_use: "sale",
        asset_type: "commercial",
        surface_m2: "1250.50",
        planned_housing_units: null,
        estimated_works_end: null,
        estimated_rental_start: null,
        public_latitude: null,
        public_longitude: null,
      },
    });
  });

  it("inclou les viviendas, les dates i la ubicació quan corresponen", () => {
    const draft: RealEstateDraft = {
      purpose: "renovation",
      intended_use: "rental",
      asset_type: "residential",
      surface: "95,25",
      housing_units: " 4 ",
      works_end: "2027-06-30",
      rental_start: "",
      location: { latitude: 41.5, longitude: 2.1 },
    };
    expect(toRealEstatePayload(draft).real_estate).toEqual({
      purpose: "renovation",
      intended_use: "rental",
      asset_type: "residential",
      surface_m2: "95.25",
      planned_housing_units: 4,
      estimated_works_end: "2027-06-30",
      estimated_rental_start: null,
      public_latitude: 41.5,
      public_longitude: 2.1,
    });
  });
});

describe("realEstateSummary", () => {
  it("resumeix només les files que corresponen", () => {
    expect(realEstateSummary(commercial)).toEqual([
      ["Finalidad · Uso · Tipo", "Adquisición · Venta · Comercial"],
      ["Superficie", "180 m²"],
      ["Ubicación aproximada", "Sin indicar"],
    ]);
  });

  it("afegeix viviendas, dates i ubicació", () => {
    const rows = realEstateSummary({
      purpose: "construction",
      intended_use: "rental",
      asset_type: "mixed",
      surface: "1.250,5",
      housing_units: "12",
      works_end: "2027-06-30",
      rental_start: "",
      location: { latitude: 41.387917, longitude: 2.169919 },
    });
    expect(rows).toEqual([
      ["Finalidad · Uso · Tipo", "Construcción · Alquiler · Mixto"],
      ["Superficie", "1.250,5 m²"],
      ["Viviendas previstas", "12"],
      ["Finalización estimada de las obras", "30 de junio de 2027"],
      ["Inicio estimado del alquiler", "Sin indicar"],
      ["Ubicación aproximada", "41,38792, 2,16992"],
    ]);
  });
});
