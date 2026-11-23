import { describe, expect, it } from "vitest";
import { DEPOSIT_AMOUNT_ERRORS, checkDepositAmount } from "../src/pages/wallet/depositAmount";

// Intl separa l'import i el símbol amb un espai no separable (U+00A0).
const eur = (text: string) => text.replace(/ €/g, " €");

describe("Ingrés: validació de l'import (US04.2, criteri 2)", () => {
  it.each([
    ["0,50", 50],
    ["0,5", 50],
    ["100", 10000],
    ["100,00", 10000],
    ["1.234,56", 123456],
    ["999.999,99", 99999999],
  ])("accepta «%s» com a %i cèntims", (text, cents) => {
    expect(checkDepositAmount(text)).toEqual({ cents });
  });

  it.each(["0,49", "0,20", "0,01", "0"])("rebutja «%s» per sota del mínim", (text) => {
    expect(checkDepositAmount(text)).toEqual({ error: eur("El ingreso mínimo es de 0,50 €.") });
  });

  it.each(["10,555", "0,001", "100,123"])("rebutja «%s» per tenir més de dos decimals", (text) => {
    expect(checkDepositAmount(text)).toEqual({ error: "Introduce un importe válido con hasta dos decimales." });
  });

  it.each(["1.0,5", "12,3,4", "abc"])("rebutja «%s» per no ser un import", (text) => {
    expect(checkDepositAmount(text)).toEqual({ error: "Introduce un importe válido con hasta dos decimales." });
  });

  it("demana l'import si el camp és buit", () => {
    expect(checkDepositAmount("   ")).toEqual({ error: "Introduce el importe a ingresar." });
  });

  it("rebutja més del màxim que Stripe admet en un pagament", () => {
    expect(checkDepositAmount("1.000.000")).toEqual({ error: eur("El ingreso máximo es de 999.999,99 €.") });
  });

  it("els missatges de la US porten l'import amb format espanyol", () => {
    expect(DEPOSIT_AMOUNT_ERRORS.minimum).toBe(eur("El ingreso mínimo es de 0,50 €."));
  });
});
