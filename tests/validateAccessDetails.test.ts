import { describe, expect, it } from "vitest";
import { validateAccessDetails } from "../src/pages/auth/validateAccessDetails";

const valid = {
  password: "Password1!",
  confirmPassword: "Password1!",
  terms: true,
  privacy: true,
};

describe("validació local de les dades d'accés", () => {
  it("accepta una contrasenya ASCII de 8 a 72 caràcters i les confirmacions", () => {
    expect(validateAccessDetails(valid)).toEqual({});
    expect(validateAccessDetails({ ...valid, password: "a".repeat(72), confirmPassword: "a".repeat(72) })).toEqual({});
  });

  it.each([
    ["buid", "", "Introduce una contraseña."],
    ["massa curta", "short", "La contraseña debe contener entre 8 y 72 carácteres."],
    ["massa llarga", "a".repeat(73), "La contraseña debe contener entre 8 y 72 carácteres."],
    ["amb Unicode no ASCII", "contraseña1", "Usa solo caracteres ASCII: letras sin tildes ni ñ, números, símbolos y espacios."],
  ])("rebutja una contrasenya %s", (_label, password, message) => {
    expect(validateAccessDetails({ ...valid, password, confirmPassword: password }).password).toBe(message);
  });

  it("valida la confirmació i els consentiments de manera independent", () => {
    expect(validateAccessDetails({ ...valid, confirmPassword: "Another1!" }).confirmPassword).toBe("Las contraseñas no coinciden.");
    expect(validateAccessDetails({ ...valid, terms: false }).terms).toBe("Debes aceptar las condiciones de uso.");
    expect(validateAccessDetails({ ...valid, privacy: false }).privacy).toBe("Debes confirmar que has leído la política de privacidad.");
  });
});
