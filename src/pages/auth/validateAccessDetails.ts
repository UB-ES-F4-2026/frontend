type AccessDetails = {
  password: string;
  confirmPassword: string;
  terms: boolean;
  privacy: boolean;
};
export type AccessDetailsErrors = Partial<Record<keyof AccessDetails, string>>;

export function validateAccessDetails(data: AccessDetails): AccessDetailsErrors {
  const errors: AccessDetailsErrors = {};
  // No retallem ni transformem la contrasenya: els espais també en formen part.
  if (!data.password) {
    errors.password = "Introduce una contraseña.";
  } else if (data.password.length < 8 || data.password.length > 72) {
    errors.password = "La contraseña debe contener entre 8 y 72 carácteres.";
  } else if (!/^[\x20-\x7E]+$/.test(data.password)) {
    errors.password = "Usa solo caracteres ASCII: letras sin tildes ni ñ, números, símbolos y espacios.";
  }
  if (!data.confirmPassword) {
    errors.confirmPassword = "Confirma tu contraseña.";
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = "Las contraseñas no coinciden.";
  }
  if (!data.terms) errors.terms = "Debes aceptar las condiciones de uso.";
  if (!data.privacy) errors.privacy = "Debes confirmar que has leído la política de privacidad.";
  return errors;
}
