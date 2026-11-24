import { formatEuroCents, parseEuroAmount } from "../../../service/money";
import type { OpportunityType } from "../../../store/useOpportunityStore";

// Com s'anomena el compromís a la interfície: una aportació en una oportunitat immobiliària
// (US03.1) i una inversió en una empresarial (US03.1.2).
export type CommitmentNoun = "aportación" | "inversión";

export const commitmentNoun = (type: OpportunityType): CommitmentNoun =>
  type === "equity" ? "inversión" : "aportación";

export const insufficientFundsMessage = (noun: CommitmentNoun) => `No tienes saldo suficiente para esta ${noun}.`;

export const INSUFFICIENT_FUNDS_MESSAGE = insufficientFundsMessage("aportación");
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

// Valida l'import abans de passar a la confirmació. El backend ho torna a comprovar en confirmar.
export const checkContribution = (
  text: string,
  limits: ContributionLimits,
  noun: CommitmentNoun = "aportación",
): ContributionCheck => {
  const parsed = parseEuroAmount(text);
  if ("error" in parsed) {
    const error =
      parsed.error === "empty"
        ? `Introduce el importe de la ${noun}.`
        : parsed.error === "decimals"
          ? "El importe no puede tener más de dos decimales."
          : INVALID_AMOUNT_MESSAGE;
    return { error, insufficientFunds: false };
  }

  const { cents } = parsed;
  const { minimumCents, remainingCents, availableCents } = limits;
  const required = requiredMinimumCents(minimumCents, remainingCents);

  if (cents < required) {
    const error =
      required === remainingCents && required < (minimumCents ?? 1)
        ? `La ${noun} debe ser de ${formatEuroCents(required)}, el importe pendiente para alcanzar el objetivo.`
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
    return { error: insufficientFundsMessage(noun), insufficientFunds: true };
  }
  return { cents };
};

// Participació estimada a l'empresa, en percentatge, si s'assoleix l'objectiu: la mateixa
// fórmula que el backend (import ÷ (valoració prèvia + objectiu)).
export const estimatedEquityPercent = (
  amountCents: number,
  { preInvestmentValuationCents, targetCents }: { preInvestmentValuationCents: number; targetCents: number },
) => (amountCents / (preInvestmentValuationCents + targetCents)) * 100;

const equityFormat = new Intl.NumberFormat("es-ES", {
  style: "percent",
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

// «0,033 %». Una participació que amb tres decimals quedaria en zero no es mostra com a 0.
export const formatEquityPercent = (percent: number) =>
  percent > 0 && percent < 0.0005 ? `< ${equityFormat.format(0.00001)}` : equityFormat.format(percent / 100);
