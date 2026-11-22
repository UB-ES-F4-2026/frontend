import { describe, expect, it } from "vitest";
import { validatePromotingEntity } from "../src/pages/auth/validatePromotingEntity";

// Any fix perquè els tests no depenguin de la data d'execució.
const CURRENT_YEAR = 2026;
const valid = { legal_name: "Promociones Ejemplo SL", founding_year: "2015", location: "Barcelona" };
const validate = (data: Partial<typeof valid>) => validatePromotingEntity({ ...valid, ...data }, CURRENT_YEAR);

describe("Registre: validació local de l'entitat promotora (US01.9)", () => {
  it("admet només la raó social, amb l'any i la ubicació buits", () => {
    expect(validate({ founding_year: "", location: "" })).toEqual({});
    expect(validate({ founding_year: "   ", location: "   " })).toEqual({});
  });

  it.each(["", "   "])("exigeix la raó social: «%s»", (legal_name) => {
    expect(validate({ legal_name })).toEqual({ legal_name: "Introduce la razón social." });
  });

  it("limita la raó social i la ubicació a 255 caràcters, sense comptar els espais exteriors", () => {
    expect(validate({ legal_name: `  ${"a".repeat(255)}  `, location: "b".repeat(255) })).toEqual({});
    expect(validate({ legal_name: "a".repeat(256) })).toHaveProperty("legal_name");
    expect(validate({ location: "b".repeat(256) })).toHaveProperty("location");
  });

  it.each(["1000", "1900", " 2015 ", String(CURRENT_YEAR)])("admet l'any de fundació %s", (founding_year) => {
    expect(validate({ founding_year })).toEqual({});
  });

  it.each(["15", "201", "20155", "0999", "abcd", "20a5", "-201", "2015.0", "1e3"])(
    "rebutja un any que no és de quatre xifres: %s",
    (founding_year) => {
      expect(validate({ founding_year })).toEqual({ founding_year: "Introduce un año de cuatro cifras, por ejemplo 2015." });
    },
  );

  it.each([String(CURRENT_YEAR + 1), "9999"])("rebutja un any posterior a l'actual: %s", (founding_year) => {
    expect(validate({ founding_year })).toEqual({ founding_year: `El año de fundación no puede ser posterior a ${CURRENT_YEAR}.` });
  });

  it("per defecte compara amb l'any actual", () => {
    const nextYear = String(new Date().getFullYear() + 1);
    expect(validatePromotingEntity({ ...valid, founding_year: nextYear })).toHaveProperty("founding_year");
  });
});
