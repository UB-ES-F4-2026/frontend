type PromotingEntityDetails = {
  legal_name: string;
  founding_year: string;
  location: string;
};
export type PromotingEntityErrors = Partial<Record<keyof PromotingEntityDetails, string>>;

// Mateixos límits que PromotingEntityRegistration al backend (backend#68).
const MAX_TEXT_LENGTH = 255;

// Replica la validació del backend com a ajuda; el servidor torna a validar.
// `currentYear` es pot injectar perquè els tests no depenguin de la data.
export function validatePromotingEntity(
  data: PromotingEntityDetails,
  currentYear = new Date().getFullYear(),
): PromotingEntityErrors {
  const errors: PromotingEntityErrors = {};

  const legalName = data.legal_name.trim();
  if (!legalName) {
    errors.legal_name = "Introduce la razón social.";
  } else if (legalName.length > MAX_TEXT_LENGTH) {
    errors.legal_name = `La razón social no puede superar los ${MAX_TEXT_LENGTH} caracteres.`;
  }

  // Opcional: només es valida si s'ha escrit alguna cosa.
  const foundingYear = data.founding_year.trim();
  if (foundingYear) {
    if (!/^[1-9][0-9]{3}$/.test(foundingYear)) {
      errors.founding_year = "Introduce un año de cuatro cifras, por ejemplo 2015.";
    } else if (Number(foundingYear) > currentYear) {
      errors.founding_year = `El año de fundación no puede ser posterior a ${currentYear}.`;
    }
  }

  if (data.location.trim().length > MAX_TEXT_LENGTH) {
    errors.location = `La ubicación no puede superar los ${MAX_TEXT_LENGTH} caracteres.`;
  }
  return errors;
}
