// Dades que crea `backend/seed_e2e_testing_data.py` i que els fluxos donen per fetes.
//
// Regles (les mateixes que documenta el seed):
// - Els comptes sembrats són de NOMÉS LECTURA: cap flux hi escriu. Un flux que modifica
//   dades registra el seu propi usuari (`createAccount`).
// - La cartera de `promotora.e2e` no rep compromisos de cap flux: els seus imports són fixos.
// - Les oportunitats de `MUTABLE` són les úniques on es compromet saldo, i cadascuna és d'un
//   sol flux. Les bessones es trien en temps d'execució perquè un reintent en trobi una de lliure.
import { E2E_PASSWORD } from "./accounts";

export const SEEDED_INVESTOR = { email: "inversora.e2e@fintech.com", password: E2E_PASSWORD };
export const SEEDED_PROMOTER = {
  email: "promotora.e2e@fintech.com",
  password: E2E_PASSWORD,
  legalName: "Promotora Determinista E2E S.L.",
};

// Cartera de només lectura de `promotora.e2e`.
export const PORTFOLIO = {
  realEstateInFunding: "Piso en Girona",
  landWithoutMap: "Parcela Rústica Cadí",
  equityInFunding: "Cervecera artesana en Girona",
  funded: "Nave Logística Objetivo Cumplido",
  expired: "Hostal Rural Plazo Vencido",
  pendingReview: "Coworking Pendiente de Revisión",
  closed: "Obrador Cierre Anticipado",
  rejected: "Proyecto Rechazado No Visible",
} as const;

// Oportunitats on escriuen els fluxos; cada una pertany a un sol flux.
export const MUTABLE = {
  realEstateCommitment: "Residencial Riera Alta",
  equityInvestment: "Movilidad Eléctrica Garraf",
  realEstateTwins: "Ático Último Tramo",
  equityTwins: "Biotech Ronda Final",
} as const;
