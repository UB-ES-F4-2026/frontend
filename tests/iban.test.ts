import { describe, expect, it } from "vitest";
import { formatIban, isValidIban, maskIban, normalizeIban } from "../src/service/iban";

describe("IBAN: validació com la del backend (US04.3, criteri 4)", () => {
  it.each([
    ["ES9121000418450200051332", "Espanya (maqueta)"],
    ["DE89370400440532013000", "Alemanya"],
    ["GB29NWBK60161331926819", "Regne Unit, amb lletres"],
    ["FR1420041010050500013M02606", "França, amb una lletra al mig"],
    ["NO9386011117947", "Noruega, el més curt (15)"],
    ["LC55HEMM000100010012001200023015", "Santa Llúcia, el més llarg de la taula (32)"],
  ])("accepta %s (%s)", (iban) => {
    expect(isValidIban(iban)).toBe(true);
  });

  it.each([
    ["ES9121000418450200051333", "dígits de control incorrectes"],
    ["ES12 3456", "incomplet (maqueta)"],
    ["ES91210004184502000513321", "una xifra de més per a Espanya"],
    ["DE8937040044053201300", "una xifra de menys per a Alemanya"],
    ["XX9121000418450200051332", "país desconegut"],
    ["ESAB21000418450200051332", "dígits de control amb lletres"],
    ["9121000418450200051332ES", "sense codi de país al davant"],
    ["ES91-2100-0418-4502-0005-1332", "amb guions"],
    ["", "buit"],
  ])("rebutja %s (%s)", (iban) => {
    expect(isValidIban(iban)).toBe(false);
  });

  it("valida l'IBAN normalitzat: sense espais i en majúscules", () => {
    expect(normalizeIban(" es91 2100 0418\t4502 0005 1332 ")).toBe("ES9121000418450200051332");
    expect(isValidIban(normalizeIban("es91 2100 0418 4502 0005 1332"))).toBe(true);
  });
});

describe("IBAN: format", () => {
  it("separa l'IBAN en grups de quatre", () => {
    expect(formatIban("ES9121000418450200051332")).toBe("ES91 2100 0418 4502 0005 1332");
    expect(formatIban("DE89370400440532013000")).toBe("DE89 3704 0044 0532 0130 00");
  });

  it("emmascara tot menys els quatre primers i els quatre últims caràcters (criteri 5)", () => {
    expect(maskIban("ES9121000418450200051332")).toBe("ES91 •••• •••• •••• •••• 1332");
    expect(maskIban("NO9386011117947")).toBe("NO93 •••• •••7 947");
  });
});
