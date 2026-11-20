import { describe, expect, it } from "vitest";
import {
  INSUFFICIENT_FUNDS_MESSAGE,
  checkContribution,
  formatAmountInput,
  parseEuroAmount,
  requiredMinimumCents,
} from "../src/pages/opportunities/dialogs/contributionAmount";
import { formatAmountCents } from "../src/service/money";

// Mockup: 250,00 € disponibles, mínim de 100,00 € i 27.000,00 € pendents.
const limits = { minimumCents: 100_00, remainingCents: 27_000_00, availableCents: 250_00 };
// Intl separa l'import i el símbol amb un espai no separable (U+00A0).
const eur = (text: string) => text.replace(/ €/g, " €");

describe("parseEuroAmount", () => {
  it.each([
    ["100", 100_00],
    ["100,5", 100_50],
    ["100,50", 100_50],
    ["100,", 100_00],
    ["1.000", 1_000_00],
    ["27.000,00", 27_000_00],
    ["1234,56", 1_234_56],
    ["100.50", 100_50],
    ["  250 € ", 250_00],
    ["0,01", 1],
  ])("interpreta «%s» com %i cèntims", (text, cents) => {
    expect(parseEuroAmount(text)).toEqual({ cents });
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["100,555", "decimals"],
    ["0,001", "decimals"],
    ["abc", "invalid"],
    ["-100", "invalid"],
    ["1,000,00", "invalid"],
    ["12.34,5", "invalid"],
    ["1e3", "invalid"],
    ["99999999999999999999", "invalid"],
  ])("rebutja «%s» (%s)", (text, error) => {
    expect(parseEuroAmount(text)).toEqual({ error });
  });
});

describe("requiredMinimumCents", () => {
  it("és l'aportació mínima mentre el pendent la supera", () => {
    expect(requiredMinimumCents(100_00, 27_000_00)).toBe(100_00);
  });

  it("és el pendent quan el pendent és inferior al mínim (l'últim inversor el completa)", () => {
    expect(requiredMinimumCents(100_00, 50_00)).toBe(50_00);
  });

  it("sense aportació mínima n'hi ha prou amb 0,01 €", () => {
    expect(requiredMinimumCents(null, 27_000_00)).toBe(1);
  });
});

describe("checkContribution", () => {
  it("accepta un import vàlid i el retorna en cèntims", () => {
    expect(checkContribution("100,00", limits)).toEqual({ cents: 100_00 });
  });

  it("accepta exactament el mínim i exactament el pendent si hi ha saldo", () => {
    expect(checkContribution("100", limits)).toEqual({ cents: 100_00 });
    expect(checkContribution("27.000", { ...limits, availableCents: 30_000_00 })).toEqual({ cents: 27_000_00 });
  });

  it.each([
    ["99,99", eur("La aportación mínima es de 100,00 €.")],
    ["0", eur("La aportación mínima es de 100,00 €.")],
    ["27.000,01", eur("El importe no puede superar los 27.000,00 € pendientes para alcanzar el objetivo.")],
    ["100,555", "El importe no puede tener más de dos decimales."],
    ["", "Introduce el importe de la aportación."],
    ["cien", "Introduce un importe válido, por ejemplo 100,00."],
  ])("rebutja «%s» amb el missatge «%s»", (text, error) => {
    expect(checkContribution(text, limits)).toEqual({ error, insufficientFunds: false });
  });

  it("indica saldo insuficient quan l'import és vàlid però supera el disponible", () => {
    expect(checkContribution("300", limits)).toEqual({
      error: INSUFFICIENT_FUNDS_MESSAGE,
      insufficientFunds: true,
    });
  });

  it("comprova el pendent abans que el saldo: superar l'objectiu no és un problema de saldo", () => {
    expect(checkContribution("30.000", limits)).toMatchObject({ insufficientFunds: false });
  });

  it("si el pendent és inferior al mínim, només accepta el pendent", () => {
    const lastContribution = { ...limits, remainingCents: 50_00 };
    expect(checkContribution("50", lastContribution)).toEqual({ cents: 50_00 });
    expect(checkContribution("40", lastContribution)).toEqual({
      error: eur("La aportación debe ser de 50,00 €, el importe pendiente para alcanzar el objetivo."),
      insufficientFunds: false,
    });
    expect(checkContribution("60", lastContribution)).toMatchObject({
      error: eur("El importe no puede superar los 50,00 € pendientes para alcanzar el objetivo."),
    });
  });

  it("sense aportació mínima admet qualsevol import positiu fins al pendent", () => {
    expect(checkContribution("0,01", { ...limits, minimumCents: null })).toEqual({ cents: 1 });
    expect(checkContribution("0", { ...limits, minimumCents: null })).toEqual({
      error: eur("La aportación mínima es de 0,01 €."),
      insufficientFunds: false,
    });
  });
});

describe("formatAmountInput: format del camp mentre s'escriu", () => {
  it.each([
    ["afegeix els punts de milers", "114000000", 9, "insertText", "114.000.000", 11],
    ["conserva els decimals escrits", "1000,5", 6, "insertText", "1.000,5", 7],
    ["un punt escrit és la coma decimal", "1000.", 5, "insertText", "1.000,", 6],
    ["ignora un segon separador decimal", "1.000,5,", 8, "insertText", "1.000,5", 7],
    ["una coma inicial es converteix en «0,»", ",", 1, "insertText", "0,", 2],
    ["treu els zeros de l'esquerra", "007", 3, "insertText", "7", 1],
    ["reagrupa en escriure darrere un import agrupat", "1.0005", 6, "insertText", "10.005", 6],
    ["reagrupa en esborrar", "1.00", 4, "deleteContentBackward", "100", 3],
    ["manté el cursor en escriure al mig", "1000", 2, "insertText", "1.000", 3],
    ["no retalla més de dos decimals (ho indica la validació)", "100,555", 7, "insertText", "100,555", 7],
    ["descarta lletres i símbols", "abc12", 5, "insertText", "12", 2],
    ["enganxar «100.50» fa servir el punt com a decimal", "100.50", 6, "insertFromPaste", "100,50", 6],
    ["enganxar «1.000» el manté com a milers", "1.000", 5, "insertFromPaste", "1.000", 5],
    ["enganxar un import amb símbol", "2.500,75 €", 10, "insertFromPaste", "2.500,75", 8],
  ])("%s: «%s» → «%s»", (_label, value, caret, inputType, text, newCaret) => {
    expect(formatAmountInput(value, caret, inputType)).toEqual({ text, caret: newCaret });
  });

  it("el text formatat es pot validar sense canvis", () => {
    const { text } = formatAmountInput("27000,01", 8);
    expect(text).toBe("27.000,01");
    expect(parseEuroAmount(text)).toEqual({ cents: 27_000_01 });
  });
});

describe("formatAmountCents", () => {
  it.each([
    [114_000_000_00, "114.000.000,00"],
    [1_000_00, "1.000,00"],
    [100_00, "100,00"],
    [5, "0,05"],
  ])("formata %i cèntims com «%s»", (cents, text) => {
    expect(formatAmountCents(cents)).toBe(text);
  });
});
