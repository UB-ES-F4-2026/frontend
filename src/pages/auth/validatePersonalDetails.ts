import { phoneCountries } from "./phoneCountries";

type PersonalDetails = {
  first_name: string;
  last_name: string;
  email: string;
  phone_country: string;
  phone: string;
};
export type PersonalDetailsErrors = Partial<Record<keyof PersonalDetails, string>>;

// Rep un número validat i evita duplicar el prefix si s'ha enganxat complet.
export function normalizePhone(phone: string, prefix: string): string {
  const digits = phone.replace(/\p{Zs}/gu, "");
  return digits.startsWith("+") ? digits : prefix + digits;
}

// Només validem el format local; la disponibilitat del correu correspon al servidor.
export function validatePersonalDetails(data: PersonalDetails): PersonalDetailsErrors {
  const errors: PersonalDetailsErrors = {};
  for (const field of ["first_name", "last_name"] as const) {
    const name = data[field].trim();
    if (!name) {
      errors[field] = field === "first_name" ? "Introduce tu nombre." : "Introduce tus apellidos.";
    } else if (!/^[\p{L}\p{M}\p{Zs}'’\-]+$/u.test(name)) {
      errors[field] = "Usa solo letras, espacios, apóstrofos y guiones.";
    }
  }

  const email = data.email.trim();
  const localPart = email.split("@")[0];
  if (!email) {
    errors.email = "Introduce tu correo electrónico.";
  } else if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(email) || localPart.startsWith(".") || localPart.endsWith(".") || localPart.includes("..")) {
    errors.email = "Introduce un correo electrónico válido.";
  }

  const country = phoneCountries.find(({ code }) => code === data.phone_country);
  if (!country) errors.phone_country = "Selecciona un país y prefijo.";
  // Els espais no afecten la validació; conservem el número tal com s'ha escrit al formulari.
  const phone = data.phone.replace(/\p{Zs}/gu, "");
  if (!phone) {
    errors.phone = "Introduce tu número de teléfono.";
  } else if (!/^\+?[0-9]+$/.test(phone)) {
    errors.phone = "Usa solo dígitos y espacios, con + únicamente al inicio del prefijo.";
  } else if (country) {
    if (phone.startsWith("+") && !phone.startsWith(country.prefix)) {
      errors.phone = "El prefijo del número debe coincidir con el país seleccionado.";
    } else {
      // Si s'enganxa el número complet, separem el prefix abans de combinar-lo una única vegada.
      const nationalNumber = phone.startsWith("+") ? phone.slice(country.prefix.length) : phone;
      const internationalNumber = normalizePhone(phone, country.prefix);
      if (!nationalNumber) {
        errors.phone = "Introduce el número de teléfono después del prefijo.";
      } else if (country.code === "ES" && nationalNumber.length !== 9) {
        errors.phone = "El número de España debe tener 9 dígitos sin contar el prefijo +34.";
      } else if (internationalNumber.length - 1 > 15) {
        errors.phone = "El teléfono no puede superar los 15 dígitos, incluido el prefijo.";
      }
    }
  }
  return errors;
}
