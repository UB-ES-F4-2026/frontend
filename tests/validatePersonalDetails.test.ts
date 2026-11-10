import { describe, expect, it } from "vitest";
import { validatePersonalDetails } from "../src/pages/auth/validatePersonalDetails";

const valid = { first_name: "María", last_name: "Prueba-López", email: "maria@example.com", phone_country: "ES", phone: "612 345 678" };

describe("Registre: validació local de dades personals (#30)", () => {
  it.each(["  María del Mar  ", "O'Connor", "D’Arcy", "Jean-Luc", "李", "Jose\u0301"])("admet lletres Unicode i separadors al nom i cognoms: %s", (name) => {
    expect(validatePersonalDetails({ ...valid, first_name: name, last_name: name })).toEqual({});
  });

  it.each(["", "   ", "María2", "López!", "Ana🙂"])("valida independentment cada nom invàlid: %s", (name) => {
    for (const field of ["first_name", "last_name"] as const) {
      expect(Object.keys(validatePersonalDetails({ ...valid, [field]: name }))).toEqual([field]);
    }
  });

  it.each(["", "usuari", "a@@example.com", "a b@example.com", "a@example", "a@-example.com", ".a@example.com", "a.@example.com", "a..b@example.com"])("rebutja el correu invàlid: %s", (email) => {
    expect(validatePersonalDetails({ ...valid, email })).toHaveProperty("email");
  });

  it("admet un correu amb majúscules, subdomini, + i espais exteriors", () => {
    expect(validatePersonalDetails({ ...valid, email: "  Maria+prova@Mail.Example.com  " })).toEqual({});
  });

  it.each([
    ["ES", "612345678"],
    ["ES", "+34 612 345 678"],
    ["FR", "612 345 678"],
    ["FR", "+33 612 345 678"],
    ["US", "202 555 0123"],
    ["CA", "+1 202 555 0123"],
    ["FR", "1234567890123"],
    ["FR", "+331234567890123"],
  ])("admet %s / %s sense duplicar el prefix ni comptar els espais", (phone_country, phone) => {
    expect(validatePersonalDetails({ ...valid, phone_country, phone })).toEqual({});
  });

  it.each([
    ["ES", "   "],
    ["ES", "61234567"],
    ["ES", "6123456789"],
    ["ES", "612ABC678"],
    ["ES", "612-345-678"],
    ["ES", "612+345678"],
    ["ES", "+33 612 345 678"],
    ["ES", "+34"],
    ["FR", "+34 612 345 678"],
    ["FR", "12345678901234"],
    ["FR", "+3312345678901234"],
  ])("rebutja el número invàlid %s / %s", (phone_country, phone) => {
    expect(validatePersonalDetails({ ...valid, phone_country, phone })).toHaveProperty("phone");
  });

  it("requereix un país del selector", () => {
    expect(validatePersonalDetails({ ...valid, phone_country: "" })).toHaveProperty("phone_country");
    expect(validatePersonalDetails({ ...valid, phone_country: "XX" })).toHaveProperty("phone_country");
  });
});
