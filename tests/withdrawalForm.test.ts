import { describe, expect, it } from "vitest";
import { checkWithdrawal, normalizeHolder } from "../src/pages/wallet/withdrawalForm";

// Intl separa l'import i el símbol amb un espai no separable (U+00A0).
const eur = (text: string) => text.replace(/ €/g, " €");

const AVAILABLE = 25000;
const valid = { amount: "100,00", iban: "ES91 2100 0418 4502 0005 1332", holder: "Ana García López" };

describe("Retirada: validació del primer pas (US04.3, criteri 4)", () => {
  it("amb dades vàlides retorna el cos de la petició, normalitzat com el backend", () => {
    expect(checkWithdrawal({ ...valid, iban: "es91 2100 0418 4502 0005 1332", holder: "  Ana   García López " }, AVAILABLE)).toEqual({
      request: { amount_cents: 10000, iban: "ES9121000418450200051332", account_holder: "Ana García López" },
    });
  });

  it.each([
    ["0,50", 50],
    ["250", 25000],
    ["250,00", 25000],
  ])("accepta l'import «%s» (%i cèntims): del mínim fins a tot el saldo disponible", (amount, cents) => {
    expect(checkWithdrawal({ ...valid, amount }, AVAILABLE)).toMatchObject({ request: { amount_cents: cents } });
  });

  it.each([
    ["", "Introduce el importe a retirar."],
    ["0,49", eur("La retirada mínima es de 0,50 €.")],
    ["0", eur("La retirada mínima es de 0,50 €.")],
    ["10,555", "Introduce un importe válido con hasta dos decimales."],
    ["abc", "Introduce un importe válido con hasta dos decimales."],
    ["250,01", "El importe supera tu saldo disponible."],
    ["1.000", "El importe supera tu saldo disponible."],
  ])("rebutja l'import «%s»: %s", (amount, error) => {
    expect(checkWithdrawal({ ...valid, amount }, AVAILABLE)).toEqual({ errors: { amount: error } });
  });

  it("el mínim té prioritat sobre el saldo: amb 0,30 € disponibles, 0,40 € és massa poc", () => {
    expect(checkWithdrawal({ ...valid, amount: "0,40" }, 30)).toEqual({ errors: { amount: eur("La retirada mínima es de 0,50 €.") } });
  });

  it.each([
    ["", "Introduce el IBAN de destino."],
    ["   ", "Introduce el IBAN de destino."],
    ["ES12 3456", "Introduce un IBAN válido."],
    ["ES91 2100 0418 4502 0005 1333", "Introduce un IBAN válido."],
  ])("rebutja l'IBAN «%s»: %s", (iban, error) => {
    expect(checkWithdrawal({ ...valid, iban }, AVAILABLE)).toEqual({ errors: { iban: error } });
  });

  it.each(["", "   "])("demana el titular si és «%s»", (holder) => {
    expect(checkWithdrawal({ ...valid, holder }, AVAILABLE)).toEqual({ errors: { holder: "Introduce el titular de la cuenta." } });
  });

  it.each([
    "Ana García López",
    "José María Núñez",
    "Marcel·lí Puig i Vidal",
    "Ana O'Brien-López",
    "Joan d’Alòs",
    "J. García",
    "Inversiones García, S.L.",
    "Zoë Müller",
  ])("accepta el titular «%s»", (holder) => {
    expect(checkWithdrawal({ ...valid, holder }, AVAILABLE)).toMatchObject({ request: { account_holder: holder } });
  });

  it.each([
    '19301·!"=·!)"·=!$()',
    "Ana García 123",
    "Ana_García",
    "ana@example.com",
    "Ana <b>García</b>",
    "Ana (García)",
    "....",
    "- ' ,",
  ])("rebutja el titular «%s»", (holder) => {
    expect(checkWithdrawal({ ...valid, holder }, AVAILABLE)).toEqual({
      errors: { holder: "Usa solo letras, espacios, puntos, comas, apóstrofos y guiones." },
    });
  });

  it("retorna l'error de cada camp alhora (maqueta)", () => {
    expect(checkWithdrawal({ amount: "300,00", iban: "ES12 3456", holder: "" }, AVAILABLE)).toEqual({
      errors: {
        amount: "El importe supera tu saldo disponible.",
        iban: "Introduce un IBAN válido.",
        holder: "Introduce el titular de la cuenta.",
      },
    });
  });

  it("normalitza els espais del titular", () => {
    expect(normalizeHolder("  Ana \t García\nLópez  ")).toBe("Ana García López");
  });
});
