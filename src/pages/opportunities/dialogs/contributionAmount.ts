import { formatEuroCents, parseEuroAmount } from "../../../service/money";

export const INSUFFICIENT_FUNDS_MESSAGE = "No tienes saldo suficiente para esta aportación.";
export const INVALID_AMOUNT_MESSAGE = "Introduce un importe válido, por ejemplo 100,00.";

export interface ContributionLimits {
  // null: l'oportunitat no té aportació mínima.
  minimumCents: number | null;
  // Import pendent per assolir l'objectiu.
  remainingCents: number;
  availableCents: number;
}

export type ContributionCheck =
  | { cents: number }
  | { error: string; insufficientFunds: boolean };

// Mateixa regla que el backend: si el pendent és inferior al mínim, el mínim passa a ser el
// pendent i l'última persona pot completar l'objectiu. Sense mínim, n'hi ha prou amb 0,01 €.
export const requiredMinimumCents = (minimumCents: number | null, remainingCents: number) =>
  Math.min(minimumCents ?? 1, remainingCents);

const FORMAT_ERRORS = {
  empty: "Introduce el importe de la aportación.",
  invalid: INVALID_AMOUNT_MESSAGE,
  decimals: "El importe no puede tener más de dos decimales.",
} as const;

// Valida l'import abans de passar a la confirmació. El backend ho torna a comprovar en confirmar.
export const checkContribution = (text: string, limits: ContributionLimits): ContributionCheck => {
  const parsed = parseEuroAmount(text);
  if ("error" in parsed) return { error: FORMAT_ERRORS[parsed.error], insufficientFunds: false };

  const { cents } = parsed;
  const { minimumCents, remainingCents, availableCents } = limits;
  const required = requiredMinimumCents(minimumCents, remainingCents);

  if (cents < required) {
    const error =
      required === remainingCents && required < (minimumCents ?? 1)
        ? `La aportación debe ser de ${formatEuroCents(required)}, el importe pendiente para alcanzar el objetivo.`
        : `La aportación mínima es de ${formatEuroCents(required)}.`;
    return { error, insufficientFunds: false };
  }
  if (cents > remainingCents) {
    return {
      error: `El importe no puede superar los ${formatEuroCents(remainingCents)} pendientes para alcanzar el objetivo.`,
      insufficientFunds: false,
    };
  }
  if (cents > availableCents) {
    return { error: INSUFFICIENT_FUNDS_MESSAGE, insufficientFunds: true };
  }
  return { cents };
};
